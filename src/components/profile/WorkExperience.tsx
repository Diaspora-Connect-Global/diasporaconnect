'use client';

import React, { Fragment, useState } from 'react';
import { Plus } from 'lucide-react';
import { ButtonType3 } from '../custom/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordionA';
import { AddWorkExperienceModal } from './modals/AddWorkExperienceModal';
import { AutocompleteAsync } from '@/components/custom/autoCompleteAsync';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ButtonType2 } from '@/components/custom/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@apollo/client/react';
import { ADD_SKILLS, AddSkillsResponse, GET_MY_SKILLS, GetUserSkillsResponse, REMOVE_SKILL, RemoveSkillResponse } from '@/services/gql/skills';
import { GET_MY_WORK_EXPERIENCE, GetUserWorkExperienceResponse, WorkExperience } from '@/services/gql/work_experience';

interface Skill {
    id: string;
    name: string;
}

interface Experience {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    contract: boolean;
    skills: string[];
    description: string;
}

interface Option {
    id: string;
    label: string;
}

// Mock data for skills autocomplete
const ALL_SKILLS: Option[] = [
    { id: '1', label: 'React' },
    { id: '2', label: 'Angular' },
    { id: '3', label: 'Vue.js' },
    { id: '4', label: 'Svelte' },
    { id: '5', label: 'Node.js' },
    { id: '6', label: 'Python' },
    { id: '7', label: 'Django' },
    { id: '8', label: 'Flask' },
    { id: '9', label: 'Ruby on Rails' },
    { id: '10', label: 'ASP.NET' },
    { id: '11', label: 'Spring Boot' },
    { id: '12', label: 'Laravel' },
    { id: '13', label: 'Express.js' },
    { id: '14', label: 'NestJS' },
    { id: '15', label: 'GraphQL' },
    { id: '16', label: 'REST API' },
    { id: '17', label: 'MongoDB' },
    { id: '18', label: 'PostgreSQL' },
    { id: '19', label: 'MySQL' },
    { id: '20', label: 'Redis' },
    { id: '21', label: 'Docker' },
    { id: '22', label: 'Kubernetes' },
    { id: '23', label: 'AWS' },
    { id: '24', label: 'Azure' },
    { id: '25', label: 'Google Cloud' },
    { id: '26', label: 'TypeScript' },
    { id: '27', label: 'JavaScript' },
    { id: '28', label: 'Java' },
    { id: '29', label: 'C#' },
    { id: '30', label: 'Go' },
    { id: '31', label: 'Rust' },
    { id: '32', label: 'Swift' },
    { id: '33', label: 'Kotlin' },
    { id: '34', label: 'React Native' },
    { id: '35', label: 'Flutter' },
];

const fetchSkills = (query: string): Promise<Option[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const lower = query.toLowerCase();
            const matches = ALL_SKILLS.filter((s) =>
                s.label.toLowerCase().includes(lower)
            );
            resolve(matches);
        }, 200);
    });
};

const createSkill = (label: string): Promise<Option> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newId = `custom-${Date.now()}`;
            resolve({ id: newId, label });
        }, 300);
    });
};

// Skills Section Skeleton
function SkillsSkeleton() {
    return (
        <div className="flex flex-wrap gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-xl" />
            ))}
        </div>
    );
}

// Work Experience Skeleton
function WorkExperienceSkeleton() {
    return (
        <div className="space-y-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex flex-wrap gap-2 mt-3">
                        {[1, 2, 3].map((j) => (
                            <Skeleton key={j} className="h-7 w-16 rounded-xl" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function WorkExperiencePage() {
    const t = useTranslations('profile.workExperience');
    const tActions = useTranslations('actions');
    
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<Option[]>([]);

    // GraphQL Queries - Load separately
    const { data: workExpData, loading: workExpLoading, refetch: refetchWorkExp } = useQuery<GetUserWorkExperienceResponse>(
        GET_MY_WORK_EXPERIENCE
    );
    
    const { data: skillsData, loading: skillsLoading, refetch: refetchSkills } = useQuery<GetUserSkillsResponse>(
        GET_MY_SKILLS
    );

    // GraphQL Mutations
    const [addSkillsMutation, { loading: addingSkills }] = useMutation<AddSkillsResponse>(ADD_SKILLS, {
        onCompleted: () => {
            refetchSkills();
            setSelectedSkills([]);
            setShowSkillModal(false);
        },
        onError: (error) => {
            console.error('Error adding skill:', error);
            alert('Failed to add skill. Please try again.');
        }
    });

    const [removeSkillMutation] = useMutation<RemoveSkillResponse>(REMOVE_SKILL, {
        onCompleted: () => {
            refetchSkills();
        },
        onError: (error) => {
            console.error('Error removing skill:', error);
            alert('Failed to remove skill. Please try again.');
        }
    });

    // Transform GraphQL data to component format
    const skills: Skill[] = skillsData?.getUserSkills.skills.map(skill => ({
        id: skill.id,
        name: skill.skillName
    })) || [];

    const experiences: Experience[] = workExpData?.getUserWorkExperience.workExperience.map((exp: WorkExperience) => {
        const startDate = formatDate(exp.startDate);
        const endDate = exp.currentlyWorking ? 'Present' : formatDate(exp.endDate || '');
        
        return {
            id: exp.id,
            company: exp.companyName,
            role: exp.role,
            startDate,
            endDate,
            contract: exp.employmentType === 'CONTRACT',
            skills: exp.skills ? exp.skills.split(',').map(s => s.trim()) : [],
            description: exp.jobDescription || ''
        };
    }) || [];

    // Helper function to format dates
    function formatDate(dateString: string): string {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    // Add skills handler
    const addSkills = async () => {
        if (selectedSkills.length === 0) return;

        try {
            await addSkillsMutation({
                variables: {
                    input: {
                        skills: selectedSkills.map(skill => ({
                            skillName: skill.label,
                            proficiencyLevel: 'intermediate' // Default level
                        }))
                    }
                }
            });
        } catch (error) {
            console.error('Error in addSkills:', error);
        }
    };

    // Remove skill handler
    const handleRemoveSkill = async (skillId: string) => {
        if (!confirm('Are you sure you want to remove this skill?')) return;

        try {
            await removeSkillMutation({
                variables: {
                    input: { skillId }
                }
            });
        } catch (error) {
            console.error('Error in handleRemoveSkill:', error);
        }
    };

    // Handle modal close and refetch
    const handleExperienceModalClose = () => {
        setShowExperienceModal(false);
        refetchWorkExp();
    };

    const handleSkillModalClose = () => {
        setShowSkillModal(false);
        setSelectedSkills([]);
    };

    return (
        <>
            <div className="mx-auto font-sans">
                {/* Skills Section */}
                <section className="mb-10">
                    <h2 className="font-bold mb-4">{t('skill')}</h2>
                    
                    {skillsLoading ? (
                        <SkillsSkeleton />
                    ) : (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {skills.map((skill) => (
                                <span
                                    key={skill.id}
                                    className="px-2 py-1 text-text-brand text-center border rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleRemoveSkill(skill.id)}
                                    title="Click to remove"
                                >
                                    {skill.name}
                                </span>
                            ))}
                            <ButtonType3
                                onClick={() => setShowSkillModal(true)}
                                className="flex items-center gap-1 px-2 py-1 text-text-brand font-medium text-sm rounded-full transition"
                            >
                                <Plus className="w-4 h-4" />
                                {t('addSkill')}
                            </ButtonType3>
                        </div>
                    )}
                </section>

                {/* Work Experience Section */}
                <section>
                    <h2 className="font-bold mb-4">{t('title')}</h2>
                    <ButtonType3
                        onClick={() => setShowExperienceModal(true)}
                        className="flex items-center gap-1 mb-6 text-text-brand font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('addExperience')}
                    </ButtonType3>

                    {workExpLoading ? (
                        <WorkExperienceSkeleton />
                    ) : experiences.length === 0 ? (
                        <p className="text-text-secondary text-sm">No work experience added yet.</p>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {experiences.map((exp, idx) => (
                                <Fragment key={idx}>
                                    <AccordionItem className='border-b-0' key={exp.id} value={exp.id}>
                                        <h3 className="text-lg font-semibold text-text-primary">{exp.company}</h3>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex justify-between items-start text-left">
                                                <div>
                                                    <p className='space-x-2'>
                                                        <span className="text-text-primary">
                                                            {exp.role} 
                                                        </span> 
                                                        <span className="text-text-secondary">
                                                            ({exp.startDate} - {exp.endDate})
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>{exp.description}</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    {exp.contract && (
                                        <span className="px-2 py-1 text-text-secondary text-center text-sm font-medium">
                                            {t('contract')}
                                        </span>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {exp.skills.map((skill, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 text-text-brand text-center border rounded-xl text-sm font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </Fragment>
                            ))}
                        </Accordion>
                    )}
                </section>
            </div>

            {/* Skill Modal with AutocompleteAsync */}
            <Dialog open={showSkillModal} onOpenChange={handleSkillModalClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('addNewSkill')}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <AutocompleteAsync
                            value={selectedSkills}
                            onChange={setSelectedSkills}
                            fetchOptions={fetchSkills}
                            onCreate={createSkill}
                            placeholder={t('skillPlaceholder') || 'Search or add skills...'}
                            label={t('skills') || 'Skills'}
                        />
                    </div>

                    <DialogFooter>
                        <ButtonType3 
                            onClick={handleSkillModalClose}
                            disabled={addingSkills}
                        >
                            {t('cancel')}
                        </ButtonType3>
                        <ButtonType2
                            onClick={addSkills}
                            disabled={selectedSkills.length === 0 || addingSkills}
                        >
                            {addingSkills ? 'Adding...' : t('addSkill')}
                        </ButtonType2>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AddWorkExperienceModal
                isOpen={showExperienceModal}
                onClose={handleExperienceModalClose}
            />
        </>
    );
}