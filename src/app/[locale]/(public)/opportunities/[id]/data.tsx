import { Award, Briefcase, Building2, Coins, Flag, GraduationCap, HandHeart, Landmark, Lightbulb, PartyPopper, Plane, Sprout, TrendingUp, type LucideIcon } from 'lucide-react';
import { CATEGORY_PHOTOS, REDESIGN_IMAGES, type RedesignImage } from '@/lib/redesignImages';

/**
 * The 13 opportunity category pages (`/opportunities/<id>`). `apiCategory` is the
 * server's category enum (the list query's `category`); the names and one-line
 * descriptions are translated under `opportunityPage.categories` and
 * `opportunityCategory.descriptions`, keyed by it. The old per-category tabs
 * ("Internships", "Career Fairs"…) were dropped: they matched on fields the list
 * never returns or no form ever fills, so they could not match anything.
 */
export type OpportunityCategoryConfig = {
    id: string;
    apiCategory: string;
    icon: LucideIcon;
    photo: RedesignImage;
};

const team = REDESIGN_IMAGES.connectCard;

export const moreOpportunitiesIDList: readonly OpportunityCategoryConfig[] = [
    { id: 'employment-career', apiCategory: 'EMPLOYMENT_CAREER', icon: Briefcase, photo: CATEGORY_PHOTOS.job },
    { id: 'education-training', apiCategory: 'EDUCATION_TRAINING', icon: GraduationCap, photo: team },
    { id: 'funding-grants', apiCategory: 'FUNDING_GRANTS', icon: Landmark, photo: CATEGORY_PHOTOS.investment },
    { id: 'fellowships-leadership', apiCategory: 'FELLOWSHIPS_LEADERSHIP', icon: Award, photo: team },
    { id: 'business-investment', apiCategory: 'BUSINESS_INVESTMENT', icon: TrendingUp, photo: CATEGORY_PHOTOS.investment },
    { id: 'volunteering-social-impact', apiCategory: 'VOLUNTEERING_SOCIAL_IMPACT', icon: HandHeart, photo: team },
    { id: 'event-creative-industry', apiCategory: 'EVENT_CREATIVE_INDUSTRY', icon: PartyPopper, photo: CATEGORY_PHOTOS.event },
    { id: 'agriculture-sustainability', apiCategory: 'AGRICULTURE_SUSTAINABILITY', icon: Sprout, photo: CATEGORY_PHOTOS.product },
    { id: 'real-estate-infrastructure', apiCategory: 'REAL_ESTATE_INFRASTRUCTURE', icon: Building2, photo: CATEGORY_PHOTOS.property },
    { id: 'government-embassy-initiatives', apiCategory: 'GOVERNMENT_EMBASSY_INITIATIVES', icon: Flag, photo: CATEGORY_PHOTOS.legal },
    { id: 'innovation-research', apiCategory: 'INNOVATION_RESEARCH', icon: Lightbulb, photo: CATEGORY_PHOTOS.service },
    { id: 'finance-economics', apiCategory: 'FINANCE_ECONOMICS', icon: Coins, photo: CATEGORY_PHOTOS.investment },
    { id: 'return-reintegration', apiCategory: 'RETURN_REINTEGRATION', icon: Plane, photo: team },
];
