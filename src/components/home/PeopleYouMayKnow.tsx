import { ChevronRight } from "lucide-react";
import PeopleYouMayKnowCard from "../cards/PeopleYouMayKnowCard";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";

export function PeopleYouMayKnow() {
    const t = useTranslations('home');
    const tActions = useTranslations('actions');

    return (
        <div className="space-y-[3.2rem] " > {/* 32px equivalent */}
            <div className="space-y-[1.2rem]"> {/* 12px equivalent */}
                <p className="caption-large">{t('peopleYouMayKnow')}</p>
                <div className="space-y-[1.6rem]"> {/* 16px equivalent */}
                    <PeopleYouMayKnowCard
                        profileImage="https://img.freepik.com/free-photo/close-up-upset-american-black-person_23-2148749582.jpg?semt=ais_hybrid&w=740&q=80"
                        name="Janet Doe"
                        mutualConnections={4}
                    />
                    <PeopleYouMayKnowCard
                        profileImage="https://img.freepik.com/free-photo/close-up-upset-american-black-person_23-2148749582.jpg?semt=ais_hybrid&w=740&q=80"
                        name="John Smith"
                        mutualConnections={120}
                    />
                    <PeopleYouMayKnowCard
                        profileImage="https://img.freepik.com/free-photo/close-up-upset-american-black-person_23-2148749582.jpg?semt=ais_hybrid&w=740&q=80"
                        name="Sarah Johnson"
                        mutualConnections={7}
                    />

                  
                </div>
            </div>
            <div className="flex justify-between ">
                <p className="caption-large text-text-primary  whitespace-nowrap">{t('events.near')}</p>
                <Link href="/events">
                    <div className="label-medium text-text-brand flex text-center justify-end items-end">
                        <p className=" whitespace-nowrap">{tActions('seemore')}</p>
                        <ChevronRight size={20} />
                    </div>
                </Link>
            </div>
        </div>
    )
}