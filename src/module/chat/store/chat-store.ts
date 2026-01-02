import { create } from 'zustand';
import { chatsType } from '../action';
import { MessageRole, MessageType } from '@/lib/generated/prisma/enums';

interface Message {
  id: string;
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageRole: MessageRole;
  messageType: MessageType;
  content: string;
  chatId: string;
}

interface CartStore {
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  chats: chatsType['data'][] | [];
  setChats: (chats: chatsType['data'][]) => void;
  messages: Message[] | [];
  setMessages: (messages: Message[]) => void;
  addChat: (chat: chatsType['data']) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  triggeredChats: Set<string>;
  markChatAsTriggered: (chatId: string) => void;
  hasChatBeenTriggered: (chatId: string) => boolean;
}

export const useChatStore = create<CartStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  triggeredChats: new Set(),

  setChats: chats => set({ chats }),
  setActiveChatId: chatId => set({ activeChatId: chatId }),
  setMessages: messages => set({ messages }),

  // ➕ Add new chat (on create)
  addChat: chat => set({ chats: [chat, ...get().chats] }),

  // 💬 Append a new message (user or assistant)
  addMessage: message => set({ messages: [...get().messages, message] }),

  // 🧹 Clear messages when switching chat
  clearMessages: () => set({ messages: [] }),

  markChatAsTriggered: chatId => {
    const triggered = new Set(get().triggeredChats);
    triggered.add(chatId);
    set({ triggeredChats: triggered });
  },

  hasChatBeenTriggered: chatId => {
    return get().triggeredChats.has(chatId);
  },
}));
