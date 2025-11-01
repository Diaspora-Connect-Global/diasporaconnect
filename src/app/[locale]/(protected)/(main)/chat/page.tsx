import { ButtonType2 } from "@/components/custom/button";
import { SquarePen } from "lucide-react";

export default function Chat() {


    function EmptyMessage() {
        return (
            <div className="flex flex-col items-center justify-center  w-full h-full ">
                <p className="font-body-medium my-5 text-center text-text-primary">
                    You have no messages here. Start a conversation to see their messages
                </p>
                <ButtonType2 className="px-4 py-3 flex items-center">
                    <SquarePen className="mr-2 h-4 w-4" />
                    New message
                </ButtonType2>
            </div>
        )
    }

    return (
        <div className="bg-surface-default roundeed-md  lg: h-full rounded-md">

            <EmptyMessage />


        </div>
    )
}