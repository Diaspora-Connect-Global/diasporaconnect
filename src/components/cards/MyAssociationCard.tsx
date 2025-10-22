'use client'
import React from 'react';
import Image from 'next/image'
import { Link } from '@/i18n/navigation';
import { ButtonType1 } from '../custom/button';


interface MyAssociationCardProps {
    id: string;
    title?: string;
    description?: string;
    logoIcon?: React.ReactNode;
    onMenuClick?: () => void;
    buttonText: string
}

export function MyAssociationCard({
    title = "GhanaConnect:Global",
    description = "Connect with professionals and businesses across Ghana and abroad.",
    logoIcon,
    buttonText,id
}: MyAssociationCardProps) {
   

    return (
        <header className="w-full border-b">
            <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4"> {/* Reduced padding on extra-small screens */}
                <div className="flex items-center justify-between gap-2"> {/* Added gap for spacing on small screens */}
                    {/* Left section - Logo and branding */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"> {/* min-w-0 and flex-1 to truncate text if needed */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"> {/* Smaller logo on mobile */}
                            {logoIcon ||
                                <Image
                                    width={32}
                                    height={32}
                                    src="/GLOBE.png"
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                                />
                            }
                        </div>

                        <div className="flex flex-col min-w-0 flex-1"> {/* Allow text truncation */}

                            <Link href={`/association/${id}`} >
                            <h1 className="text-text-primary font-label-large hover:text-text-brand truncate"> {/* Responsive font and truncate long titles */}
                                {title}
                            </h1>

                            </Link>
                            <p className="text-text-primary font-body-small text-xs sm:text-sm text-wrap line-clamp-1"> {/* Smaller font, clamp description on small screens */}
                                {description}
                            </p>
                        </div>
                    </div>

                    <ButtonType1 className='px-2 py-1'>
                        {buttonText}                    
                        </ButtonType1>


                </div>
            </div>
        </header>
    );
}