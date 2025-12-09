'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface TicketTypeCardProps {
  title: string;
  price: string;
  description?: string;
  quantity: number;                    // Controlled quantity
  onQuantityChange: (quantity: number) => void; // Required update handler
}

export default function TicketTypeCard({
  title,
  price,
  description,
  quantity,
  onQuantityChange,
}: TicketTypeCardProps) {
  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    onQuantityChange(quantity + 1);
  };

  return (
    <div className="w-full  rounded-2xl border border-border-brand p-5 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        {/* Left: Title, Price, Description */}
        <div className="flex-1">
          <h3 className="heading-xsmall ">{title}</h3>
          <p className="label-large text-text-primary mt-1">{price}</p>
          {description && (
            <p className="label-large text-text-secondary mt-3">{description}</p>
          )}
        </div>

        {/* Right: Quantity Selector */}
        <div className="flex items-center  border border-border-brand rounded-full h-11 px-2 shadow-sm">
          <button
            onClick={handleDecrement}
            disabled={quantity === 0}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-brand  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>

          <span className="w-10 text-center text-text-primary ">
            {quantity}
          </span>

          <button
            onClick={handleIncrement}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-brand  transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
     
      </div>
    </div>
  );
}