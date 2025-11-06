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
    description:string;
}

export default function WorkExperience() {
    const [skills, setSkills] = useState<Skill[]>([
        { id: '1', name: 'React' },
        { id: '2', name: 'Angular' },
        { id: '3', name: 'Vue.js' },
        { id: '4', name: 'Svelte' },
        { id: '5', name: 'Ember' },
        { id: '6', name: 'Backbone.js' },
        { id: '7', name: 'jQuery' },
        { id: '8', name: 'Django' },
        { id: '9', name: 'Flask' },
        { id: '10', name: 'Ruby on Rails' },
        { id: '11', name: 'ASP.NET' },
        { id: '12', name: 'Spring' },
        { id: '13', name: 'Laravel' },
        { id: '14', name: 'Express' },
        { id: '15', name: 'NativeScript' },
    ]);

    const [experiences, ] = useState<Experience[]>([
        {
            id: '1',
            company: 'Grete Solutions',
            role: 'Frontend Developer',
            startDate: 'Jan 2012',
            endDate: 'Nov 2024',
            contract: true,
            skills: ['React', 'Angular', 'NativeScript'],
            description:'A Frontend Developer is responsible for creating the visual elements of a website or application that users interact with. They use languages like HTML, CSS, and JavaScript to build responsive and engaging user interfaces, ensuring a seamless experience across different devices. Their role involves collaborating with designers and backend developers to implement design concepts and optimize performance.'
        },
    ]);

    const [showSkillModal, setShowSkillModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [newExperience, ] = useState({
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        contract: false,
        description: ''
    });

    const addSkill = () => {
        if (newSkill.trim()) {
            setSkills([...skills, { id: Date.now().toString(), name: newSkill.trim() }]);
            setNewSkill('');
            setShowSkillModal(false);
        }
    };


    return (
        <>
            <div className="mx-auto font-sans">
                {/* Skills Section */}
                <section className="mb-10">
                    <h2 className="font-bold mb-4">Skill</h2>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {skills.map((skill) => (
                            <span
                                key={skill.id}
                                className="px-2 py-1 text-text-brand text-center border rounded-xl text-sm font-medium"
                            >
                                {skill.name}
                            </span>
                        ))}
                        <ButtonType3
                            onClick={() => setShowSkillModal(true)}
                            className="flex items-center gap-1 px-2 py-1 text-text-brand font-medium text-sm rounded-full transition"
                        >
                            <Plus className="w-4 h-4" />
                            Add skill
                        </ButtonType3>
                    </div>
                </section>

                {/* Work Experience Section */}
                <section>
                    <h2 className="font-bold mb-4">Work experience</h2>
                    <ButtonType3
                        onClick={() => setShowExperienceModal(true)}
                        className="flex items-center gap-1 mb-6 text-text-brand font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add experience
                    </ButtonType3>

                    <Accordion type="single" collapsible className="w-full">
                        {experiences.map((exp,idx) => (
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
                                    <span className="px-2 py-1 text-text-secondary text-center  text-sm font-medium">
                                        Contract
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
                </section>
            </div>

            {/* Skill Modal */}
            {showSkillModal && (
                <div className="fixed inset-0  bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Add New Skill</h3>
                        <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="e.g., TypeScript"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowSkillModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addSkill}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Add Skill
                            </button>
                        </div>
                    </div>
                </div>
            )}

             <AddWorkExperienceModal
                    isOpen={showExperienceModal}
                    onClose={() => setShowExperienceModal(false)}
                    initialData={newExperience}
                  />
            
        </>
    );
}