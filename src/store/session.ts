export const getActiveChat = (): { id: string; type: 'direct' | 'group' } | null => {
    if (typeof window === 'undefined') return null;
    const activeChat = sessionStorage.getItem('activeChat');
    return activeChat ? JSON.parse(activeChat) : null;
};

export const setActiveChat = (chat: { id: string; type: 'direct' | 'group' } | null) => {
    if (typeof window === 'undefined') return;
    if (chat) {
        sessionStorage.setItem('activeChat', JSON.stringify(chat));
    } else {
        sessionStorage.removeItem('activeChat');
    }
};

export const clearActiveChat = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('activeChat');
};