// components/PersonalDetails.tsx
import { Card, CardContent } from "@/components/ui/card";



export function PersonalDetails() {
    return (
        <Card className=" lg:h-[6rem]">
            <CardContent className="">
                <h2 className="text-lg font-semibold">When joined</h2>


                <p>1st November, 2025</p>
            </CardContent>
        </Card>
    );
}