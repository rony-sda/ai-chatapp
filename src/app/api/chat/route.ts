import { convertToModelMessages, streamText } from "ai";
import db from "@/lib/db";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import { MessageRole, MessageType } from '@/lib/generated/prisma/enums';
import { NextRequest } from "next/server";


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
    const parts = JSON.parse(msg.content) as Array<{ type: string; text?: string }>;
    const validParts = parts
      .filter((part: { type: string; text?: string }) => part.type === "text" && part.text !== undefined)
      .map((part: { type: string; text?: string }) => ({ type: "text", text: part.text! }));

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

function extractPartsAsJSON(message: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  if (message.parts && Array.isArray(message.parts)) {
    return JSON.stringify(message.parts);
  }

  const content = message.content || "";
  return JSON.stringify([{ type: "text", text: content }]);
}

function getFriendlyErrorMessage(error: any): { title: string; message: string } {
  const status = error?.statusCode || error?.lastError?.statusCode || 500;
  const msg = (error?.message || "").toLowerCase();

  if (status === 429 || msg.includes("rate limit")) {
    return {
      title: "Rate Limit Reached",
      message: "The selected model is temporarily rate-limited. Please wait a few moments or try a different model.",
    };
  }

  if (msg.includes("developer instruction") || msg.includes("system prompt")) {
    return {
      title: "System Prompt Not Supported",
      message: "This model does not support system instructions. We've automatically disabled it for this request.",
    };
  }

  if (status === 404 || msg.includes("model not found")) {
    return {
      title: "Model Not Found",
      message: "The selected model is not available. Please choose another model.",
    };
  }

  if (msg.includes("context") && msg.includes("exceed")) {
    return {
      title: "Context Too Long",
      message: "The conversation is too long. Start a new chat or shorten your message.",
    };
  }

  return {
    title: "Something Went Wrong",
    message: error?.message || "An unexpected error occurred. Please try again.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      chatId?: string;
      messages?: unknown;
      model?: string;
      skipUserMessage?: boolean;
    };
    
    const {
      chatId,
      messages: newMessages,
      model,
      skipUserMessage,
    } = body;

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
            .filter((p: { type: string; text?: string }) => p.type === "text")
            .map((p: { type: string; text?: string }) => p.text)
            .join("\n"),
        }))
        .filter((m: { role: string; content: string }) => m.content);
    }


    const streamTextOptions: {
      model: ReturnType<typeof provider.chat>;
      messages: typeof modelMessages;
      system?: string;
    } = {
      model: provider.chat(model || ""),
      messages: modelMessages,
    };

    streamTextOptions.system = CHAT_SYSTEM_PROMPT;

    const result = streamText(streamTextOptions);

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: allUIMessages,
      onFinish: async ({ responseMessage }: { responseMessage: { parts?: Array<{ type: string; text?: string }> } }) => {
        try {
          // Ensure chatId and model are defined before saving
          if (!chatId || !model) {
            console.error("❌ Cannot save messages: chatId or model is missing", { chatId, model });
            return;
          }

          const messagesToSave: Array<{
            chatId: string;
            content: string;
            messageRole: typeof MessageRole.USER | typeof MessageRole.ASSISTANT;
            model: string;
            messageType: typeof MessageType.NORMAL;
          }> = [];

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
 
    return new Response(
      JSON.stringify({
        error: "chat_error",
    message: error.message || "Internal Error",
    friendlyMessage: getFriendlyErrorMessage(error),
    statusCode: error?.statusCode || 500,
      }),
      {
        status: error?.statusCode || error?.lastError?.statusCode || 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}