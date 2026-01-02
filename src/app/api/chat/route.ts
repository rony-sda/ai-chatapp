import { convertToModelMessages, streamText, tool } from "ai";
import db from "@/lib/db";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import { MessageRole, MessageType } from '@/lib/generated/prisma/enums';


// initalize openRouter provider
const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function convertStoredMessageToUI(msg: {
  id: string;
  messageRole: string;
  content: string;
  createdAt: Date;
}): {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; text: string }>;
  createdAt: Date;
} | null {
  try {
    const parts = JSON.parse(msg.content);
    const validParts = parts.filter((part: any) => part.type === "text");

    if (validParts.length === 0) return null;

    const role = msg.messageRole.toUpperCase();
    const normalizedRole: "user" | "assistant" | "system" =
      role === "USER" ? "user" : role === "ASSISTANT" ? "assistant" : "system";

    return {
      id: msg.id,
      role: normalizedRole,
      parts: validParts,
      createdAt: msg.createdAt,
    };
  } catch (e) {
    const role = msg.messageRole.toUpperCase();
    const normalizedRole: "user" | "assistant" | "system" =
      role === "USER" ? "user" : role === "ASSISTANT" ? "assistant" : "system";

    return {
      id: msg.id,
      role: normalizedRole,
      parts: [{ type: "text", text: msg.content }],
      createdAt: msg.createdAt,
    };
  }
}

function extractPartsAsJSON(message) {
  if (message.parts && Array.isArray(message.parts)) {
    return JSON.stringify(message.parts);
  }

  const content = message.content || "";
  return JSON.stringify([{ type: "text", text: content }]);
}

// Check if a model supports system prompts
// Some models (like Google Gemma) don't support system/developer instructions
function modelSupportsSystemPrompt(model: string): boolean {
  if (!model) return true; // Default to supporting if model is not provided
  
  const modelLower = model.toLowerCase();
  
  // Models that don't support system prompts
  // Check for various formats: "gemma", "google/gemma", "gemma-3n", etc.
  const unsupportedPatterns = [
    'gemma-3n',
    'gemma-2b',
    'gemma-7b',
    'gemma-1.1',
    '/gemma', // Matches "google/gemma-*" patterns
  ];
  
  // If model name contains any unsupported pattern, it doesn't support system prompts
  const isUnsupported = unsupportedPatterns.some(pattern => modelLower.includes(pattern));
  
  return !isUnsupported;
}

export async function POST(req) {
  try {
    const {
      chatId,
      messages: newMessages,
      model,
      skipUserMessage,
    } = await req.json();

    const previousMessages = chatId
      ? await db.message.findMany({
          where: { chatId },
          orderBy: {
            createdAt: "asc",
          },
        })
      : [];

    const uiMessages = previousMessages
      .map(convertStoredMessageToUI)
      .filter((msg) => msg !== null);

    const normalizedNewMessages = Array.isArray(newMessages)
      ? newMessages
      : [newMessages];

    const allUIMessages = [...uiMessages, ...normalizedNewMessages];

    let modelMessages;

    try {
      modelMessages = await convertToModelMessages(allUIMessages);
    } catch (conversionError) {
      modelMessages = allUIMessages
        .map((msg) => ({
          role: msg.role,
          content: msg.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("\n"),
        }))
        .filter((m) => m.content);
    }

    // Check if model supports system prompts
    const supportsSystemPrompt = modelSupportsSystemPrompt(model);

    const streamTextOptions: any = {
      model: provider.chat(model),
      messages: modelMessages,
    };

    // Only add system prompt if the model supports it
    // Some models (like Google Gemma) don't support system/developer instructions
    if (supportsSystemPrompt && CHAT_SYSTEM_PROMPT) {
      streamTextOptions.system = CHAT_SYSTEM_PROMPT;
    }

    const result = streamText(streamTextOptions);

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: allUIMessages,
      onFinish: async ({ responseMessage }) => {
        try {
          const messagesToSave = [];

          if (!skipUserMessage) {
            const latestUserMessage =
              normalizedNewMessages[normalizedNewMessages.length - 1];

            if (latestUserMessage?.role === "user") {
              const userPartsJSON = extractPartsAsJSON(latestUserMessage);

              messagesToSave.push({
                chatId,
                content: userPartsJSON,
                messageRole: MessageRole.USER,
                model,
                messageType: MessageType.NORMAL,
              });
            }
          }

          if (responseMessage?.parts && responseMessage.parts.length > 0) {
            const assistantPartsJSON = extractPartsAsJSON(responseMessage);

            messagesToSave.push({
              chatId,
              content: assistantPartsJSON,
              messageRole: MessageRole.ASSISTANT,
              model,
              messageType: MessageType.NORMAL,
            });
          }

          if (messagesToSave.length > 0) {
            await db.message.createMany({
              data: messagesToSave,
            });
          }
        } catch (error) {
          console.error("❌ Error saving messages:", error);
        }
      },
    });
  } catch (error: any) {
    console.error("❌ API Route Error:", error);
    
    // Handle OpenRouter specific errors
    if (error?.statusCode === 404 && error?.responseBody) {
      try {
        const errorBody = JSON.parse(error.responseBody);
        if (errorBody?.error?.message?.includes("data policy")) {
          return new Response(
            JSON.stringify({
              error: "OpenRouter configuration required",
              message: "Please configure your data policy settings at https://openrouter.ai/settings/privacy",
              details: errorBody.error.message,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      } catch (parseError) {
        // If parsing fails, fall through to generic error
      }
    }
    
    // Handle models that don't support system prompts (400)
    if (error?.statusCode === 400 || error?.lastError?.statusCode === 400) {
      try {
        const errorBody = error?.responseBody || error?.lastError?.responseBody;
        if (errorBody) {
          const parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
          const rawMessage = parsed?.error?.metadata?.raw;
          
          if (rawMessage && typeof rawMessage === 'string') {
            const innerError = JSON.parse(rawMessage);
            if (innerError?.error?.message?.includes("Developer instruction is not enabled") || 
                innerError?.error?.message?.includes("developer instruction")) {
              return new Response(
                JSON.stringify({
                  error: "Model doesn't support system prompts",
                  message: "This model doesn't support system instructions. The system prompt has been automatically disabled for this model.",
                  details: innerError.error.message,
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                }
              );
            }
          }
        }
      } catch (parseError) {
        // If parsing fails, fall through to generic error
      }
    }
    
    // Handle rate limit errors (429)
    if (error?.statusCode === 429 || error?.lastError?.statusCode === 429) {
      let rateLimitMessage = "Rate limit exceeded. Please try again in a moment.";
      let rateLimitDetails = "";
      
      try {
        const errorBody = error?.responseBody || error?.lastError?.responseBody;
        if (errorBody) {
          const parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
          if (parsed?.error?.metadata?.raw) {
            rateLimitDetails = parsed.error.metadata.raw;
            if (rateLimitDetails.includes("rate-limited upstream")) {
              rateLimitMessage = "The free model is temporarily rate-limited. Please wait a moment and try again, or add your own API key at https://openrouter.ai/settings/integrations";
            }
          }
        }
      } catch (parseError) {
        // If parsing fails, use default message
      }
      
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: rateLimitMessage,
          details: rateLimitDetails || error?.message,
          retryAfter: "Please wait a few seconds before trying again",
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": "60" // Suggest retry after 60 seconds
          },
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: error?.statusCode || error?.lastError?.statusCode || 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}