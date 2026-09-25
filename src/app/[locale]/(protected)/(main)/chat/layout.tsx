"use client"
import ChatSideBar from "@/components/chats/Sidebar";
import { useChatStore } from "@/store/ChatStore";

/**
 * Two panes on md+, one pane on phones — decided by CSS breakpoints, not by a
 * `window.innerWidth` effect. The old `isMobile` state started `false`, so a
 * phone's first paint showed BOTH panes and then collapsed to one.
 */
export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const activeChat = useChatStore((s) => s.activeChat);

    return (
        <div className="flex w-full lg:w-[80vw] h-app-inner mx-auto overflow-hidden">
            {/* Sidebar - hidden on phones while a chat is open */}
            <div className={`flex-shrink-0 w-full md:w-[350px] lg:w-[30vw] min-w-0 ${
                activeChat ? 'hidden md:block' : 'block'
            }`}>
                <ChatSideBar />
            </div>

            {/* Chat area - hidden on phones while no chat is open */}
            <div className={`flex-1 min-w-0 h-app-inner overflow-hidden ${
                activeChat ? 'block' : 'hidden md:block'
            }`}>
                {children}
            </div>
        </div>
    );
}
