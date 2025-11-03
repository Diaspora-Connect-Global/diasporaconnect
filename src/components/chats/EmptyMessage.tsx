// components/empty-message.tsx
'use client';

import { useState } from 'react';
import { StartConversationModal } from '@/components/chats/modals/StartConversationModal';
import { SquarePen } from 'lucide-react';
import { ButtonType2 } from '../custom/button';



export function EmptyMessage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full h-full p-6">
        <p className="font-body-medium my-5 text-center text-text-primary">
          You have no messages here. Start a conversation to see their messages
        </p>
        
        <ButtonType2 
          className="px-4 py-3 flex items-center"
          onClick={() => setIsModalOpen(true)}
       
        >
          <SquarePen className="mr-2 h-4 w-4" />
          New message
        </ButtonType2>
      </div>

      <StartConversationModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        type='direct'
      />
    </>
  );
}