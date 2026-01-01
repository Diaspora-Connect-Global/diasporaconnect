// components/home/ViewFilter.tsx
'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Users } from 'lucide-react';

export default function ViewFilter() {
  const [view, setView] = useState<'you' | 'following'>('you');

  useEffect(() => {
    const saved = sessionStorage.getItem('viewFilter');
    if (saved === 'you' || saved === 'following') {
      setView(saved);
    }
  }, []);

  const handleViewChange = (newView: 'you' | 'following') => {
    setView(newView);
    sessionStorage.setItem('viewFilter', newView);
  };

  return (
    <div className="relative flex items-center surface-subtle/30 backdrop-blur-xl rounded-full p-1 border border-subtle shadow-md w-full max-w-md mx-auto">
      {/* Sliding Background */}
      <div
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.5rem)] surface-brand rounded-full transition-all duration-300 ease-out shadow-sm ${
          view === 'following' ? 'translate-x-[calc(100%+0.5rem)]' : 'translate-x-0'
        }`}
      />
      
      {/* You Button */}
      <button
        onClick={() => handleViewChange('you')}
        className={`relative z-10 flex items-center justify-center gap-2 flex-1 py-1.5 rounded-full text-sm transition-all duration-200 ${
          view === 'you' 
            ? 'text-white' 
            : 'text-secondary hover:text-primary'
        }`}
      >
        <UserCheck className="w-4 h-4" />
        <span className="font-medium">You</span>
      </button>
      
      {/* Following Button */}
      <button
        onClick={() => handleViewChange('following')}
        className={`relative z-10 flex items-center justify-center gap-2 flex-1 py-1.5 rounded-full text-sm transition-all duration-200 ${
          view === 'following' 
            ? 'text-white' 
            : 'text-secondary hover:text-primary'
        }`}
      >
        <Users className="w-4 h-4" />
        <span className="font-medium">Following</span>
      </button>
    </div>
  );
}