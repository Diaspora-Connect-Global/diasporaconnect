import { ChevronRight } from "lucide-react";
import PeopleYouMayKnowCard from "../cards/PeopleYouMayKnowCard";
import { useTranslations } from 'next-intl';

export function PeopleYouMayKnow() {
    const t = useTranslations('home');
    const tActions = useTranslations('actions');
    
    return (
        <div className="w-[90%] mx-4">
            <p className="font-caption-large">{t('peopleYouMayKnow')}</p>
            <div className="p-4 space-y-2">
                <PeopleYouMayKnowCard
                    profileImage="/path1.jpg"
                    name="Janet Doe"
                    mutualConnections={4}
                />
                <PeopleYouMayKnowCard
                    profileImage="/path2.jpg"
                    name="John Smith"
                    mutualConnections={12}
                />
                <PeopleYouMayKnowCard
                    profileImage="/path3.jpg"
                    name="Sarah Johnson"
                    mutualConnections={7}
                />
            </div>

            <div className="flex justify-between">
                <p className="font-caption-large text-text-primary">{t('events.near')}</p>
                <div className="font-label-medium text-text-brand flex text-center justify-center items-center">
                    <p className="">{tActions('seemore')}</p>
                    <ChevronRight size={20} />
                </div>
            </div>
        </div>
    )
}