'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Bookmark, Clock, ExternalLink } from "lucide-react";
import { useState } from "react";

interface OpportunityItemProps {
    item: {
        title: string;
        company?: string;
        location?: string;
        type?: string;
        date?: string;
        imageUrl?: string;
    };
}

export const CustomEmploymentComponent = ({ item }: OpportunityItemProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <>
            {/* Clickable card that opens dialog */}
            <div
                className="flex items-start gap-4 p-4 border border-border-subtle rounded-lg hover:border-border-brand hover:shadow-sm transition-all duration-200 cursor-pointer bg-surface-default"
                onClick={() => setIsDialogOpen(true)}
            >
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                        {item.title}
                    </h3>

                    <div className="flex items-center gap-2 text-text-primary text-sm mb-2">
                        {item.company && (
                            <span className="font-medium">{item.company}</span>
                        )}
                        {item.company && item.location && (
                            <span className="text-border-strong">,</span>
                        )}
                        {item.location && (
                            <span>{item.location}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-text-primary text-sm">
                        {item.type && (
                            <span className="inline-flex items-center gap-1">
                                {item.type}
                            </span>
                        )}
                    </div>
                </div>

                <span className="inline-flex items-center gap-1">
                    {item.date}
                </span>
            </div>

            {/* Dialog */}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="min-w-[70rem] max-h-[90vh] overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <DialogHeader className="text-left">
                                <div className="space-y-2">
                                    {/* Company and Location */}
                                    <div className="text-text-secondary text-sm">
                                        {item.company}, {item.location}
                                    </div>

                                    {/* Job Title */}
                                    <DialogTitle className="text-2xl font-bold text-text-primary">
                                        {item.title}
                                    </DialogTitle>

                                    {/* Time ago */}
                                    <div className="flex items-center gap-1 text-text-secondary text-sm">
                                        <Clock className="w-4 h-4" />
                                        {item.date}
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Job Description */}
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">
                                    Job description
                                </h3>
                                <p className="text-text-primary text-sm leading-relaxed">
                                    The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.
                                </p>
                            </section>

                            {/* Job Responsibilities */}
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">
                                    Job responsibilities
                                </h3>
                                <ul className="text-text-primary ml-[2%] text-sm space-y-2 list-disc list-inside">
                                    <li>The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.</li>
                                    <li>The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.</li>
                                </ul>
                            </section>

                            {/* Job Requirements */}
                            <section>
                                <h3 className="text-lg font-semibold text-text-primary mb-3">
                                    Job requirements
                                </h3>
                                <ul className="text-text-primary ml-[2%] text-sm space-y-2 list-disc list-inside">
                                    <li>The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.</li>
                                    <li>The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.</li>
                                    <li>The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.</li>
                                    <li>The developer will aid the engineering team efforts of making the website functional and more responsive, while also improving front-end components that would drive user interaction.</li>

                                </ul>
                            </section>
                        </div>

                        {/* Right Column - Job Meta Information */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4 space-y-6">
                                {/* Job Meta Information Card */}
                                <div className="bg-surface-tertiary w-[20rem] rounded-lg p-4 border border-border-subtle">
                                    <div className="space-y-4">
                                        <div className="text-text-secondary text-sm">
                                            <strong>Posted by</strong> GhanaConnectGlobal Admin
                                        </div>

                                            <div className="flex items-center gap-2 text-text-primary text-sm">
                                                Remote |  Full-time |  Apply before Nov 1, 2025
                                            </div>

                                        <div className="flex items-center gap-2 text-text-secondary text-sm">
                                            <Clock className="w-4 h-4" />
                                            Posted {item.date}
                                        </div>
                                    </div>

                                    {/* Skills Section */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-text-primary my-3">
                                            Skills
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {['React', 'Angular', 'Vue.js', 'Svelte', 'React', 'Vue', 'Angular', 'Ember', 'Backbone'].map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-surface- text-text-brand rounded-full text-sm border border-border-subtle"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Action Buttons */}
                                    <div className="mt-2 w-full flex flex-col justify-center gap-3">

                                        <div className="text-text-info bg-surface-info p-2 rounded-md">
                                            <p>How to apply:</p>
                                            <p className=" text-sm">Send your resume and portfolio to
                                                <a href="mailto:ashertettehabotsi@gmail.com" className="text-text-info underline ml-1">
                                                    carreers@gretesolutions.com
                                                </a>
                                            </p>

                                        </div>


                                        <button
                                            className="flex-1 px-6 py-3 text-text-white border bg-surface-brand font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                               window.open('https://gh.linkedin.com/jobs/easy-apply-jobs?countryRedirected=1', '_blank');
                                            }}
                                        >
                                            <span>Apply now</span>
                                            <ExternalLink className="w-4 h-4" />
                                        </button>


                                        <button className="flex-1 px-6 py-3 bg-surface-brand text-text-white font-medium hover:bg-surface-brand transition-colors cursor-pointer flex items-center justify-center  rounded-full">
                                            Apply now
                                        </button>
                                        <button
                                            className="flex-1 px-6 py-3 text-text-brand border border-border-brand font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <Bookmark className="w-4 h-4" />
                                            <span>Save now</span>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>





















        </>
    );
};