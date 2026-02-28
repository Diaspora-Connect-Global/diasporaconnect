import { Award, BriefcaseBusiness, Building2, DollarSign, GraduationCap, Heart, Home, Landmark, Lightbulb, LucideIcon, Palette, Sprout, StickyNoteIcon, TrendingUp } from "lucide-react";  



export interface Opportunity {
    title: string;
    id: string;
    imageUrl?: string;
    icon?: LucideIcon;
}

  export  const opportunities: Opportunity[] = [
        { title: "Employment & Career", id: "employment-career", icon: BriefcaseBusiness },
        { title: "Education & Training", id: "education-training", icon: GraduationCap },
        { title: "Funding & Grants", id: "funding-grants", icon: DollarSign },
        { title: "Fellowships & Leadership", id: "fellowships-leadership", icon: Award },
        { title: "Business & Investment", id: "business-investment", icon: Building2 },
        { title: "Volunteering & Social Impact", id: "volunteering-social-impact", icon: Heart },
        { title: "Event & Creative Industry", id: "event-creative-industry", icon: Palette },
        { title: "Agriculture & Sustainability", id: "agriculture-sustainability", icon: Sprout },
        { title: "Real Estate & Infrastructure", id: "real-estate-infrastructure", icon: Home },
        { title: "Gov't & Embassy Initiatives", id: "government-embassy-initiatives", icon: Landmark },
        { title: "Innovation & Research", id: "innovation-research", icon: Lightbulb },
        { title: "Finance & Economics", id: "finance-economics", icon: TrendingUp },
        { title: "Return & Reintegration", id: "return-reintegration", icon: StickyNoteIcon },
    ];