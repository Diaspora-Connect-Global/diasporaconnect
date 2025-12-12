import React from 'react';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

interface LoadingScreenProps {
  text?: string;
  showLogo?: boolean;
  showSpinner?: boolean;
  bgColor?: string;
}

export default function LoadingScreen({ 
  text, 
  showLogo = true, 
  showSpinner = true,
  bgColor = 'bg-background'
}: LoadingScreenProps) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center ${bgColor}`}>
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        {showLogo && (
          <div className="relative w-32 h-32">
            <Image
              src="/LOGO.svg"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        )}

        {/* Spinner with optional text */}
        {showSpinner && (
          <div className="flex items-center gap-3">
            <Spinner className='size-6 text-text-brand' />
            {text && (
              <p className="text-sm text-muted-foreground">{text}</p>
            )}
          </div>
        )}

        {/* Text only (when spinner is hidden) */}
        {!showSpinner && text && (
          <p className="text-sm text-text-primary">{text}</p>
        )}
      </div>
    </div>
  );
}

// Usage examples:
// <LoadingScreen />
// <LoadingScreen text="Loading..." />
// <LoadingScreen showLogo={false} text="Processing..." />
// <LoadingScreen showSpinner={false} text="Please wait" />
// <LoadingScreen bgColor="bg-black" text="Loading..." />
// <LoadingScreen bgColor="bg-white" showLogo={false} text="Almost there..." />