import { Link } from "@/i18n/navigation";
import Image from "next/image";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string; // Required background image URL
}

export default function EventCardSmall({ title, date, location, attendees, imageUrl }: EventCardProps) {
    return (
        <div className="lg:w-[18.3125rem]  flex lg:space-x-[0.5rem] bg-surface-default rounded-lg ">
            {/* 293px, 100px, 8px equivalent */}
            
            {/* Image Container */}
            <div className="relative rounded-l-lg overflow-hidden lg:w-[4.6875rem] ">
                {/* 75px, 100px equivalent */}
                <Image
                    src={imageUrl}
                    alt={`${title} background`}
                    layout="fill"
                    objectFit="center"
                    className="w-full h-full object-center"
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
                        objectFit="cover"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
            
            {/* Content Container */}
            <div className="lg:w-[13.125rem]  py-[0.5rem] pr-[0.5rem] ">
                {/* 210px, 100px equivalent with 8px padding */}
                <Link href="/events/1">
                    <h2 className=" font-caption-large text-primary truncate">{title}</h2>
                </Link>
                <p className=" font-caption-medium text-primary mt-[0.25rem]">{date}</p>
                {/* 4px margin */}
                <div className="lg:flex flex-wrap flex-start mt-[0.25rem]">
                    {/* 4px margin */}
                    <span className="text-secondary font-caption-small">{location} | </span>
                    <p className="text-secondary font-caption-small"> {attendees} going</p>
                </div>
            </div>
        </div>
    );
}