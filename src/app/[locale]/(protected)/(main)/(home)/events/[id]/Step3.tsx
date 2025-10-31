'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function Step3() {
    return (
        <div className="w-full flex flex-col items-center text-center space-y-8 ">
            {/* Success Icon */}
            <CheckCircle className="w-16 h-16 text-text-success" />

            {/* Success Message */}
            <h2 className="text-2xl font-medium text-text-primary">
                Ticket purchase successfully
            </h2>

            {/* Primary Action */}
            <button className="w-full max-w-xs px-6 py-3 bg-surface-brand text-text-white font-medium rounded-full hover:bg-surface-brand/90 transition-colors   cursor-pointer">
                View ticket
            </button>

            {/* Secondary Action */}
            <Link
                href="/events"
                className="text-surface-brand font-medium hover:underline focus:outline-none focus:underline"
            >
                Browse more events
            </Link>
        </div>
    );
}