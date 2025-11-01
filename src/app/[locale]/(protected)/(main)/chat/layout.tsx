import ChatSideBar from "@/components/chats/Sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex lg:w-[75rem] lg:h-[48rem] mx-auto mt-5">
            <div className="lg:w-[22rem] px-2"> {/* 64px equivalent */}
                <ChatSideBar />

            </div>
            <div className="flex-1 scrollbar-hide lg:w-[51rem] px-2  roundeed-md">
                {children}
            </div>
        </div>
    );
} 