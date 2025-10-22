import { Bookmark } from "lucide-react";
import Image from "next/image";
import { ButtonType1, ButtonType2 } from "../custom/button";
import Link from "next/link";

// EventCard1 Component with Props
interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string; // Required background image URL
}

export default function EventCard2({ title, date, location, attendees, imageUrl }: EventCardProps) {
    return (
        <div className="w-full  bg-surface-default rounded-lg overflow-hidden shadow-lg">
            {/* Header Image */}
            <div className="relative h-64 rounded-t-lg overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={`${title} background`}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                    }}
                />
                <div className="hidden w-full h-full bg-surface-subtle" style={{ display: "none" }}>
                    <Image
                        src="/EVENT.png"
                        alt="Fallback event background"
                        layout="fill"
                        objectFit="contain"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Event Details */}
            <div className="p-6">
                <Link href="/events/1">
                    <h2 className="text-2xl font-bold text-primary mb-2">{title}</h2>
                </Link>
                <p className="text-lg font-semibold text-primary mb-1">{date}</p>
                <p className="text-secondary mb-1">{location}</p>
                <p className="text-secondary text-sm mb-6">{attendees} going</p>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-between">
                    <div className="flex items-center gap-4">
                        <ButtonType2 className=" py-3 px-6 rounded-full"> {/* Added px-6 for balance */}
                            Attend
                        </ButtonType2>
                        <ButtonType1 className="flex items-center justify-center  py-3 px-6 rounded-full overflow-hidden">
                            Saved
                        </ButtonType1>

                    </div>
                    <ButtonType1 className="flex items-center justify-center py-3 px-6 rounded-full overflow-hidden">
                        <Image
                            src="/SHARE.svg"
                            alt="Share Icon"
                            width={24}
                            height={24}
                            className="object-contain"
                        />
                    </ButtonType1>
                </div>

                <div className="mt-6 border-t pt-4">
                    <p className="text-xl font-bold text-primary">About</p>
                    <p className="text-primary mt-2 text-justify">
                        Join us for the Accra Arts Festival, a vibrant celebration of Ghanaian culture and creativity. Experience captivating performances, stunning art exhibitions, and engaging workshops that showcase the rich heritage of Ghana. Whether you&apos;re an art enthusiast or simply looking for a fun day out, this festival promises something for everyone. Don&apos;t miss out on this unforgettable event!
                        

                    </p>
                </div>
            </div>
        </div>
    );
}