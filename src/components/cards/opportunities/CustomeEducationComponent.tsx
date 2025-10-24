import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";

interface EducationItemProps {
    item: {
        title: string;
        institution?: string;
        location?: string;
        type?: string;
        date?: string;
        imageUrl?: string;
        duration?: string;
        level?: string;
    };
}

export const CustomEducationComponent = ({ item }: EducationItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            {/* Clickable card */}
            <div 
                className="flex items-start gap-4 p-4 border border-border-subtle rounded-lg hover:border-border-brand hover:shadow-sm transition-all duration-200 cursor-pointer bg-surface-default"
                onClick={() => setIsDialogOpen(true)}
            >
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                        {item.title}
                    </h3>

                    <div className="flex items-center gap-2 text-text-primary text-sm mb-2">
                        {item.institution && (
                            <span className="font-medium">{item.institution}</span>
                        )}
                        {item.institution && item.location && (
                            <span className="text-border-strong">,</span>
                        )}
                        {item.location && (
                            <span>{item.location}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-text-primary text-sm">
                        {item.level && (
                            <span className="inline-flex items-center gap-1">
                                {item.level}
                            </span>
                        )}
                        {item.duration && (
                            <span className="inline-flex items-center gap-1">
                                {item.duration}
                            </span>
                        )}
                    </div>
                </div>

                <span className="inline-flex items-center gap-1">
                    {item.date}
                </span>
            </div>

            {/* Dialog for detailed view */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {/* Dialog content similar to employment component but tailored for education */}
                </DialogContent>
            </Dialog>
        </>
    );
};