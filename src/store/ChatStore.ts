// stores/chatStore.ts
import { create } from 'zustand';
import { getActiveChat, setActiveChat } from '@/store/session';

interface ActiveChat {
  id: string;
  type: 'direct' | 'group';
}

interface ChatStore {
  activeChat: ActiveChat | null;
  setActiveChat: (chat: ActiveChat | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChat: getActiveChat(),
  
  setActiveChat: (chat) => {
    if (chat) {
      setActiveChat(chat); // Save to session storage
    } else {
      sessionStorage.removeItem('activeChat');
    }
    set({ activeChat: chat });
  },
}));