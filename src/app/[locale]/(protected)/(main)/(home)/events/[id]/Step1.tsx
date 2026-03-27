'use client';

import TicketTypeCard from "@/components/cards/events/TicketTypeCard";
import Image from "next/image";
import { useTranslations } from 'next-intl';

interface Step1Props {
  quantity: number;               // <-- controlled from parent
  onQuantityChange: (n: number) => void;
  eventTitle: string;
  eventDate: string;
  ticketTitle: string;
  ticketPrice: string;
  ticketDescription?: string;
}

export default function Step1({
  quantity,
  onQuantityChange,
  eventTitle,
  eventDate,
  ticketTitle,
  ticketPrice,
  ticketDescription,
}: Step1Props) {
  const t = useTranslations('home.events.payment');
  
  return (
    <div className="bg-surface-default overflow-y-auto scrollbar-hide">
      <section className="pb-4 mb-4">
        <p className="heading-small text-primary">{eventTitle}</p>
        <div className="flex gap-2 label-large items-center text-text-secondary">
          <Image src="/CALENDAR.svg" alt="Calendar" width={16} height={16} />
          <span>{eventDate}</span>
        </div>
      </section>

      <section>
        <TicketTypeCard
          title={ticketTitle || t('ticketTypeRegular')}
          price={ticketPrice}
          description={ticketDescription || t('ticketDescription')}
          quantity={quantity}               // <-- controlled
          onQuantityChange={onQuantityChange} // <-- updates parent
        />
      </section>
    </div>
  );
}