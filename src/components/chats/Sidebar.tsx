"use client"
import { useState } from "react";
import { SearchInput } from "../custom/input";
import { SquarePen } from "lucide-react";

export default function ChatSideBar() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <>
            <div className="flex justify-between items-center  text-center">
                <p className="text-2xl font-heading-large ">Chats</p>


                <div className="text-text-brand flex items-center cursor-pointer">
                    <SquarePen className="mr-2 h-4 w-4" />
                    <p >New message</p>

                </div>

            </div>
            <div className=" w-full my-2">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={() => { }}
                    placeholder={"Search messages"}
                    id="main-search"
                    bg="bg-surface-default"
                />
            </div>


        </>
    )
}