'use client';

import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  CreditCardIcon, 
  SendIcon 
} from 'lucide-react';
import { ButtonType2 } from '@/components/custom/button';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export default function QuickActions() {
  const actions: QuickAction[] = [
    {
      id: 'deposit',
      label: 'Deposit',
      icon: <ArrowDownIcon className="w-5 h-5" />,
      onClick: () => console.log('Deposit clicked'),
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: <ArrowUpIcon className="w-5 h-5" />,
      onClick: () => console.log('Withdraw clicked'),
    },
    {
      id: 'send',
      label: 'Send',
      icon: <SendIcon className="w-5 h-5" />,
      onClick: () => console.log('Send clicked'),
    },
    {
      id: 'cards',
      label: 'Cards',
      icon: <CreditCardIcon className="w-5 h-5" />,
      onClick: () => console.log('Cards clicked'),
    },
  ];

  return (
    <div className="bg-surface-default rounded-lg p-6 border border-border-subtle">
      <h3 className="heading-small text-text-primary mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action) => (
          <ButtonType2
            key={action.id}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center py-4 px-6 gap-2 h-auto"
          >
            {action.icon}
            <span className="label-medium">{action.label}</span>
          </ButtonType2>
        ))}
      </div>
    </div>
  );
}
