// components/empty-message.tsx
'use client';

import { useState } from 'react';
import { StartConversationModal } from '@/components/chats/modals/StartConversationModal';
import { SquarePen } from 'lucide-react';
import { ButtonType2 } from '../custom/button';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/feedback';



export function EmptyMessage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations('chat');

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full h-full p-6">
        <EmptyState
          icon={SquarePen}
          title={t('empty.title')}
          action={
            <ButtonType2
              className="px-4 py-3 flex items-center"
              onClick={() => setIsModalOpen(true)}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              {t('newMessage')}
            </ButtonType2>
          }
        />
      </div>

      <StartConversationModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        type='direct'
      />
    </>
  );
}