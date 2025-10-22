import React from 'react';

interface AboutAssociationProps {
  members: number;
  createdDate: string;
  visibility: string;
  description: string;
}

export default function AboutAssociation({ members, createdDate, visibility, description }: AboutAssociationProps) {
  return (
    <div className="flex justify-center items-center my-4">
      <div className="w-72 min-h-74 bg-surface-default rounded-lg shadow-sm p-4 flex flex-col gap-3">
        {/* Header Section */}
          <h2 className="text-lg font-semibold text-text-primary">About</h2>
        <div className="flex items-start mb-1 gap-1">
            <span className="text-sm font-semibold text-text-primary">{members}</span>
            <span className="text-xs text-text-primary">members</span>
        </div>
        
        {/* Creation Date */}
        <div className='flex gap-2'>
          <div className="text-xs text-text-secondary">{createdDate}</div>
          <span className="text-xs font-medium">{visibility}</span>
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

