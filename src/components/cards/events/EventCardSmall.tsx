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
        <div className="lg:w-[calc(293/1512*100vw)] lg:h-[calc(100/922*100vh)] flex lg:space-x-[calc(8/1512*100vw)] bg-surface-default rounded-lg">
            <div className="relative rounded-l-lg overflow-hidden lg:w-[calc(75/1512*100vw)] lg:h-[calc(100/922*100vh)] ">
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
            <div className="lg:w-[calc(210/1512*100vw)] lg:h-[calc(100/922*100vh)] ">
                <Link href="/events/1">
                    <h2 className="text-2xl font-caption-large text-primary ">{title}</h2>
                </Link>
                <p className="text-lg font-caption-medium text-primary ">{date}</p>
                <div className="lg:flex flex-wrap flex-start">
                    <span className="text-secondary font-caption-small ">{location} | </span>
                    <p className="text-secondary  font-caption-small  "> {attendees} going</p>
                </div>
            </div>
        </div>
    );

}