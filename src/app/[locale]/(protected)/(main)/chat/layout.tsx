// layout.tsx
"use client"
import { useState, useEffect } from "react";
import ChatSideBar from "@/components/chats/Sidebar";
import { useChatStore } from "@/store/ChatStore";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { activeChat } = useChatStore();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex w-full lg:w-[80vw] h-app-inner mx-auto lg:mt-5"> 
            {/* Sidebar - hidden on mobile when chat is active */}
            <div className={`w-full md:w-[350px] lg:w-[30vw] px-2 ${
                isMobile && activeChat ? 'hidden' : 'block'
            }`}>
                <ChatSideBar />
            </div>
            
            {/* Chat area - hidden on mobile when no chat is active */}
            <div className={`flex-1 scrollbar-hide w-full lg:w-[50vw] h-app-inner px-2 rounded-md overflow-hidden ${
                isMobile && !activeChat ? 'hidden' : 'block'
            }`}>
                {children}
            </div>
        </div>
    );
}