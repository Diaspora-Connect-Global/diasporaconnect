// components/PersonalDetails.tsx
import { Card, CardContent } from "@/components/ui/card";

interface PersonalDetailsProps {
    data: {
        joinDate: string;
    };
}

export function PersonalDetails({ data }: PersonalDetailsProps) {
    return (
        <Card className="h-full">
            <CardContent className="h-full flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col justify-center">
                    <h2 className="text-lg font-semibold mb-2">When joined</h2>
                    <p className="text-sm text-text-secondary">{data.joinDate}</p>
                </div>
            </CardContent>
        </Card>
    );
}