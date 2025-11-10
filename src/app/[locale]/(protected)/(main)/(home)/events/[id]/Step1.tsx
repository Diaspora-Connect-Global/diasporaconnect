'use client';

import TicketTypeCard from "@/components/cards/events/TicketTypeCard";
import Image from "next/image";
import { useTranslations } from 'next-intl';

interface Step1Props {
  quantity: number;               // <-- controlled from parent
  onQuantityChange: (n: number) => void;
}

export default function Step1({ quantity, onQuantityChange }: Step1Props) {
  const t = useTranslations('home.events.payment');
  
  return (
    <div>
      <section className="pb-4 mb-4">
        <p className="font-heading-small text-primary">Accra Arts Events</p>
        <div className="flex gap-2 items-center text-text-secondary">
          <Image src="/CALENDAR.svg" alt="Calendar" width={16} height={16} />
          <span>Oct 21, 2025, 3:00PM</span>
        </div>
      </section>

      <section>
        {/* Pass the *exact* values that come from EventsId */}
        <TicketTypeCard
          title={t('ticketTypeRegular')}
          price="GH¢300.00"
          description={t('ticketDescription')}
          quantity={quantity}               // <-- controlled
          onQuantityChange={onQuantityChange} // <-- updates parent
        />
      </section>
    </div>
  );
}