import React from 'react';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

/**
 * Props for the LoadingScreen component.
 */
interface LoadingScreenProps {
  /**
   * Optional text to display below the logo/spinner.
   * Useful for providing context about what's loading.
   * 
   * @example "Loading your dashboard..."
   * @example "Authenticating..."
   */
  text?: string;

  /**
   * Whether to display the application logo.
   * 
   * @defaultValue true
   */
  showLogo?: boolean;

  /**
   * Whether to display the loading spinner.
   * When false, only text (if provided) will be shown.
   * 
   * @defaultValue true
   */
  showSpinner?: boolean;

  /**
   * Background color class for the loading screen.
   * Accepts any Tailwind CSS background color class.
   * 
   * @defaultValue 'bg-background'
   * @example 'bg-white'
   * @example 'bg-black'
   * @example 'bg-gray-50'
   */
  bgColor?: string;
}

/**
 * Full-screen loading component with customizable logo, spinner, and text.
 * 
 * @description
 * Provides a centered loading screen that can be used during authentication checks,
 * page transitions, or any async operations. The component is fully customizable
 * with options to show/hide the logo, spinner, and loading text.
 * 
 * The loading screen takes up the full viewport and centers all content both
 * horizontally and vertically. It's positioned fixed to ensure it stays in place
 * even when the underlying content scrolls.
 * 
 * @example
 * Basic usage with default settings
 * ```tsx
 * <LoadingScreen />
 * ```
 * 
 * @example
 * With custom loading text
 * ```tsx
 * <LoadingScreen text="Loading your dashboard..." />
 * ```
 * 
 * @example
 * Without logo, only spinner and text
 * ```tsx
 * <LoadingScreen showLogo={false} text="Processing your request..." />
 * ```
 * 
 * @example
 * Text only, no spinner
 * ```tsx
 * <LoadingScreen showSpinner={false} text="Please wait..." />
 * ```
 * 
 * @example
 * With custom background color
 * ```tsx
 * <LoadingScreen bgColor="bg-white" text="Authenticating..." />
 * ```
 * 
 * @example
 * Dark loading screen
 * ```tsx
 * <LoadingScreen 
 *   bgColor="bg-black" 
 *   text="Loading..." 
 * />
 * ```
 * 
 * @example
 * Minimal version - logo and text only
 * ```tsx
 * <LoadingScreen 
 *   showSpinner={false} 
 *   text="Almost there..." 
 * />
 * ```
 * 
 * @param props - Component props
 * @returns Full-screen loading component
 */
export default function LoadingScreen({ 
  text, 
  showLogo = true, 
  showSpinner = true,
  bgColor = 'bg-background'
}: LoadingScreenProps) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center ${bgColor}`}>
      <div className="flex flex-col items-center gap-6">
        {/* Logo Section */}
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