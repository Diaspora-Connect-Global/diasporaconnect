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

export default function WorkExperiencePage() {
    const t = useTranslations('profile.workExperience');
    const tActions = useTranslations('actions');
    
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [newSkill, setNewSkill] = useState('');

    // GraphQL Queries
    const { data: workExpData, loading: workExpLoading, refetch: refetchWorkExp } = useQuery<GetUserWorkExperienceResponse>(
        GET_MY_WORK_EXPERIENCE
    );
    
    const { data: skillsData, loading: skillsLoading, refetch: refetchSkills } = useQuery<GetUserSkillsResponse>(
        GET_MY_SKILLS
    );

    // GraphQL Mutations
    const [addSkillsMutation] = useMutation<AddSkillsResponse>(ADD_SKILLS, {
        onCompleted: () => {
            refetchSkills();
            setNewSkill('');
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

    // Add skill handler
    const addSkill = async () => {
        if (!newSkill.trim()) return;

        try {
            await addSkillsMutation({
                variables: {
                    input: {
                        skills: [{
                            skillName: newSkill.trim(),
                            proficiencyLevel: 'intermediate' // Default level
                        }]
                    }
                }
            });
        } catch (error) {
            console.error('Error in addSkill:', error);
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

    // Loading state
    if (workExpLoading || skillsLoading) {
        return (
            <div className="mx-auto font-sans">
                <p className="text-center text-text-secondary">Loading...</p>
            </div>
        );
    }

    return (
        <>
            <div className="mx-auto font-sans">
                {/* Skills Section */}
                <section className="mb-10">
                    <h2 className="font-bold mb-4">{t('skill')}</h2>
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

                    {experiences.length === 0 ? (
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

            {/* Skill Modal */}
            {showSkillModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">{t('addNewSkill')}</h3>
                        <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                            placeholder={t('skillPlaceholder')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowSkillModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={addSkill}
                                disabled={!newSkill.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('addSkill')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddWorkExperienceModal
                isOpen={showExperienceModal}
                onClose={handleExperienceModalClose}
            />
        </>
    );
}