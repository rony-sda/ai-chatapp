import { create } from "zustand";

interface CartStore {
    activeChatId: string | null;
    setActiveChatId: (chatId: string) => void;
}


export const useChatStore = create<CartStore>((set, get) => ({
  activeChatId: null,
  setActiveChatId: (chatId : string) => set({ activeChatId: chatId }),
 
}));