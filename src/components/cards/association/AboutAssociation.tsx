import { useTranslations } from 'next-intl';
import React from 'react';
import Image from 'next/image';

interface AboutAssociationProps {
  members: number;
  createdDate: string;
  visibility: string;
  description: string;
}

export default function AboutAssociation({ members, createdDate, visibility, description }: AboutAssociationProps) {

  const t = useTranslations('static');
  return (
    <div className="flex justify-center items-center mb-4">
      <div className="min-w-72 min-h-74 bg-surface-default rounded-lg shadow-sm p-4 flex flex-col gap-3">
        {/* Header Section */}
          <h2 className="text-lg font-semibold text-text-primary">{t("about")}</h2>
        <div className="flex items-center gap-2 text-text-secondary mb-1">
          <Image src="/MEMBERS.svg" alt="Members Icon" width={16} height={16} />
          <span>{members}</span>
          <span>{t("members")}</span>
        </div>
        {/* Creation Date */}
        <div className='flex gap-2'>
                    <Image src="/CALENDAR.svg" alt="Members Icon" width={16} height={16} />

          <div className=" text-text-secondary">{createdDate}</div>
                              <Image src="/PUBLIC.svg" alt="Members Icon" width={16} height={16} />

          <span className="text-text-secondary ">{visibility}</span>
        </div>
        
        {/* Description Section */}
        <div>
          <p className="text-sm text-text-primary">
            {description}
          </p>
        </div>       
      </div>
    </div>
  );
}

