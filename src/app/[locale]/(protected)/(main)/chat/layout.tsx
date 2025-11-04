import ChatSideBar from "@/components/chats/Sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex lg:w-[80vw] lg:max-h-[80vh] mx-auto mt-5 "> 
            <div className="w-[30vw] px-2">
                <ChatSideBar />
            </div>
            <div className="flex-1 scrollbar-hide lg:w-[50vw] lg:h-[80vh] px-2 rounded-md overflow-hidden"> {/* Added overflow-hidden */}
                {children}
            </div>
        </div>
    );
}