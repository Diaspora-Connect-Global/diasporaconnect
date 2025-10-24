import { Award, BriefcaseBusiness, Building2, DollarSign, GraduationCap, Heart, Home, Landmark, Lightbulb, LucideIcon, Palette, Sprout, StickyNoteIcon, TrendingUp } from "lucide-react";  



export interface Opportunity {
    title: string;
    id: string;
    imageUrl?: string;
    icon?: LucideIcon;
}

  export  const opportunities: Opportunity[] = [
        {
            title: "Employment & Career",
            id: "employment-career",
            imageUrl: "/images/opportunities/employment-career.jpg",
            icon: BriefcaseBusiness
        },
        {
            title: "Education & Training",
            id: "education-training",
            imageUrl: "/images/opportunities/education-training.jpg",
            icon: GraduationCap
        },
        {
            title: "Funding & Grants",
            id: "funding-grants",
            imageUrl: "/images/opportunities/funding-grants.jpg",
            icon: DollarSign
        },
        {
            title: "Fellowships & Leadership",
            id: "fellowships-leadership",
            imageUrl: "/images/opportunities/fellowships-leadership.jpg",
            icon: Award
        },
        {
            title: "Business & Investment",
            id: "business-investment",
            imageUrl: "/images/opportunities/business-investment.jpg",
            icon: Building2
        },
        {
            title: "Volunteering & Social Impact",
            id: "volunteering-social-impact",
            imageUrl: "/images/opportunities/volunteering-social-impact.jpg",
            icon: Heart
        },
        {
            title: "Event & Creative Industry",
            id: "event-creative-industry",
            imageUrl: "/images/opportunities/event-creative-industry.jpg",
            icon: Palette
        },
        {
            title: "Agriculture & Sustainability",
            id: "agriculture-sustainability",
            imageUrl: "/images/opportunities/agriculture-sustainability.jpg",
            icon: Sprout
        },
        {
            title: "Real Estate & Infrastructure",
            id: "real-estate-infrastructure",
            imageUrl: "/images/opportunities/real-estate-infrastructure.jpg",
            icon: Home
        },
        {
            title: "Gov't & Embassy Initiatives",
            id: "government-embassy-initiatives",
            imageUrl: "/images/opportunities/government-embassy-initiatives.jpg",
            icon: Landmark
        },
        {
            title: "Innovation & Research",
            id: "innovation-research",
            imageUrl: "/images/opportunities/innovation-research.jpg",
            icon: Lightbulb
        },
        {
            title: "Finance & Economics",
            id: "finance-economics",
            imageUrl: "/images/opportunities/finance-economics.jpg",
            icon: TrendingUp
        },
        {
            title: "Return & Reintegration",
            id: "return-reintegration",
            imageUrl: "/images/opportunities/return-reintegration.jpg",
            icon: StickyNoteIcon
        }
    ];