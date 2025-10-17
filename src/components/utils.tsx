'use client';

import React from 'react';

// =============================================================================
// TYPOGRAPHY COMPONENTS
// =============================================================================

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

// Display Typography
export const DisplayLarge: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h1 className={`display-large ${className}`}>{children}</h1>
);

export const DisplayMedium: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h1 className={`display-medium ${className}`}>{children}</h1>
);

export const DisplaySmall: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h1 className={`display-small ${className}`}>{children}</h1>
);

// Heading Typography
export const HeadingLarge: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h2 className={`heading-large ${className}`}>{children}</h2>
);

export const HeadingMedium: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h3 className={`heading-medium ${className}`}>{children}</h3>
);

export const HeadingSmall: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h4 className={`heading-small ${className}`}>{children}</h4>
);

export const HeadingXSmall: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h5 className={`heading-xsmall ${className}`}>{children}</h5>
);

// Body Typography
export const BodyLarge: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`body-large ${className}`}>{children}</p>
);

export const BodyMedium: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`body-medium ${className}`}>{children}</p>
);

export const BodySmall: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`body-small ${className}`}>{children}</p>
);

// Label Typography
export const LabelLarge: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`label-large ${className}`}>{children}</span>
);

export const LabelMedium: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`label-medium ${className}`}>{children}</span>
);

export const LabelSmall: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`label-small ${className}`}>{children}</span>
);

// Caption Typography
export const CaptionLarge: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`caption-large ${className}`}>{children}</span>
);

export const CaptionMedium: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`caption-medium ${className}`}>{children}</span>
);

// =============================================================================
// SURFACE COMPONENTS
// =============================================================================

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SurfaceDefault: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-default ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceSubtle: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-subtle ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceDisabled: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-disabled ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceBrand: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-brand ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceBrandLight: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-brand-light ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceBrandSubtle: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-brand-subtle ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceDanger: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-danger ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceWarning: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-warning ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceSuccess: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-success ${className}`} onClick={onClick}>
    {children}
  </div>
);

export const SurfaceInfo: React.FC<SurfaceProps> = ({ children, className = '', onClick }) => (
  <div className={`surface-info ${className}`} onClick={onClick}>
    {children}
  </div>
);

// =============================================================================
// TEXT COLOR COMPONENTS
// =============================================================================

interface TextColorProps {
  children: React.ReactNode;
  className?: string;
}

export const TextPrimary: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-primary ${className}`}>{children}</span>
);

export const TextSecondary: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-secondary ${className}`}>{children}</span>
);

export const TextTertiary: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-tertiary ${className}`}>{children}</span>
);

export const TextWhite: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-white ${className}`}>{children}</span>
);

export const TextBrand: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-brand ${className}`}>{children}</span>
);

export const TextDanger: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-danger ${className}`}>{children}</span>
);

export const TextWarning: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-warning ${className}`}>{children}</span>
);

export const TextSuccess: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-success ${className}`}>{children}</span>
);

export const TextInfo: React.FC<TextColorProps> = ({ children, className = '' }) => (
  <span className={`text-info ${className}`}>{children}</span>
);

// =============================================================================
// BORDER COMPONENTS
// =============================================================================

interface BorderProps {
  children: React.ReactNode;
  className?: string;
  size?: '1' | '2' | '4' | '8';
}

const getBorderClass = (size: string = '1') => {
  const sizes = {
    '1': 'border',
    '2': 'border-2',
    '4': 'border-4',
    '8': 'border-8'
  };
  return sizes[size as keyof typeof sizes] || 'border';
};

export const BorderDefault: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-default ${className}`}>
    {children}
  </div>
);

export const BorderDarker: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-darker ${className}`}>
    {children}
  </div>
);

export const BorderSubtle: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-subtle ${className}`}>
    {children}
  </div>
);

export const BorderDisabled: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-disabled ${className}`}>
    {children}
  </div>
);

export const BorderBrand: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-brand ${className}`}>
    {children}
  </div>
);

export const BorderDanger: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-danger ${className}`}>
    {children}
  </div>
);

export const BorderWarning: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-warning ${className}`}>
    {children}
  </div>
);

export const BorderSuccess: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-success ${className}`}>
    {children}
  </div>
);

export const BorderInfo: React.FC<BorderProps> = ({ children, className = '', size = '1' }) => (
  <div className={`${getBorderClass(size)} border-info ${className}`}>
    {children}
  </div>
);

// =============================================================================
// STATUS COMPONENTS
// =============================================================================

interface StatusBadgeProps {
  type: 'danger' | 'warning' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, children, className = '' }) => {
  const baseClasses = "inline-flex items-center px-3 py-1 rounded-full";
  
  const typeClasses = {
    danger: 'surface-danger text-danger',
    warning: 'surface-warning text-warning',
    success: 'surface-success text-success',
    info: 'surface-info text-info'
  };

  return (
    <span className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <BodySmall>{children}</BodySmall>
    </span>
  );
};

// =============================================================================
// CARD COMPONENTS
// =============================================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'brand' | 'danger' | 'warning' | 'success' | 'info';
  border?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  border = true 
}) => {
  const surfaceClasses = {
    default: 'surface-default',
    brand: 'surface-brand-subtle',
    danger: 'surface-danger',
    warning: 'surface-warning',
    success: 'surface-success',
    info: 'surface-info'
  };

  const borderClasses = border ? 'border border-subtle' : '';

  return (
    <div className={`rounded-lg p-6 ${surfaceClasses[variant]} ${borderClasses} ${className}`}>
      {children}
    </div>
  );
};

// =============================================================================
// EXAMPLE IMPLEMENTATION COMPONENT
// =============================================================================

export const DesignSystemShowcase: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Typography Showcase */}
      <SurfaceDefault className="p-6 rounded-lg">
        <HeadingLarge className="mb-6">Typography Scale</HeadingLarge>
        
        <div className="space-y-4">
          <DisplayLarge>Display Large</DisplayLarge>
          <DisplayMedium>Display Medium</DisplayMedium>
          <DisplaySmall>Display Small</DisplaySmall>
          
          <HeadingLarge>Heading Large</HeadingLarge>
          <HeadingMedium>Heading Medium</HeadingMedium>
          <HeadingSmall>Heading Small</HeadingSmall>
          <HeadingXSmall>Heading XSmall</HeadingXSmall>
          
          <BodyLarge>Body Large - The quick brown fox jumps over the lazy dog</BodyLarge>
          <BodyMedium>Body Medium - The quick brown fox jumps over the lazy dog</BodyMedium>
          <BodySmall>Body Small - The quick brown fox jumps over the lazy dog</BodySmall>
          
          <div className="flex gap-4 mt-4">
            <LabelLarge>Label Large</LabelLarge>
            <LabelMedium>Label Medium</LabelMedium>
            <LabelSmall>Label Small</LabelSmall>
          </div>
          
          <div className="flex gap-4 mt-2">
            <CaptionLarge>Caption Large</CaptionLarge>
            <CaptionMedium>Caption Medium</CaptionMedium>
          </div>
        </div>
      </SurfaceDefault>

      {/* Color Tokens Showcase */}
      <SurfaceDefault className="p-6 rounded-lg">
        <HeadingLarge className="mb-6">Color Tokens</HeadingLarge>
        
        {/* Surface Colors */}
        <HeadingMedium className="mb-4">Surface Colors</HeadingMedium>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SurfaceDefault className="p-4 rounded border text-center">
            <BodySmall>Default</BodySmall>
          </SurfaceDefault>
          <SurfaceSubtle className="p-4 rounded border text-center">
            <BodySmall>Subtle</BodySmall>
          </SurfaceSubtle>
          <SurfaceBrand className="p-4 rounded border text-center text-white">
            <BodySmall>Brand</BodySmall>
          </SurfaceBrand>
          <SurfaceBrandLight className="p-4 rounded border text-center">
            <BodySmall>Brand Light</BodySmall>
          </SurfaceBrandLight>
        </div>

        {/* Status Surfaces */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SurfaceDanger className="p-4 rounded border text-center">
            <BodySmall>Danger</BodySmall>
          </SurfaceDanger>
          <SurfaceWarning className="p-4 rounded border text-center">
            <BodySmall>Warning</BodySmall>
          </SurfaceWarning>
          <SurfaceSuccess className="p-4 rounded border text-center">
            <BodySmall>Success</BodySmall>
          </SurfaceSuccess>
          <SurfaceInfo className="p-4 rounded border text-center">
            <BodySmall>Info</BodySmall>
          </SurfaceInfo>
        </div>

        {/* Text Colors */}
        <HeadingMedium className="mb-4">Text Colors</HeadingMedium>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SurfaceDefault className="p-4 rounded border">
            <TextPrimary><BodySmall>Text Primary</BodySmall></TextPrimary>
          </SurfaceDefault>
          <SurfaceDefault className="p-4 rounded border">
            <TextSecondary><BodySmall>Text Secondary</BodySmall></TextSecondary>
          </SurfaceDefault>
          <SurfaceDefault className="p-4 rounded border">
            <TextBrand><BodySmall>Text Brand</BodySmall></TextBrand>
          </SurfaceDefault>
          <SurfaceBrand className="p-4 rounded border">
            <TextWhite><BodySmall>Text White</BodySmall></TextWhite>
          </SurfaceBrand>
        </div>

        {/* Status Text Colors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SurfaceDefault className="p-4 rounded border">
            <TextDanger><BodySmall>Text Danger</BodySmall></TextDanger>
          </SurfaceDefault>
          <SurfaceDefault className="p-4 rounded border">
            <TextWarning><BodySmall>Text Warning</BodySmall></TextWarning>
          </SurfaceDefault>
          <SurfaceDefault className="p-4 rounded border">
            <TextSuccess><BodySmall>Text Success</BodySmall></TextSuccess>
          </SurfaceDefault>
          <SurfaceDefault className="p-4 rounded border">
            <TextInfo><BodySmall>Text Info</BodySmall></TextInfo>
          </SurfaceDefault>
        </div>
      </SurfaceDefault>

      {/* Border Showcase */}
      <SurfaceDefault className="p-6 rounded-lg">
        <HeadingLarge className="mb-6">Border Colors</HeadingLarge>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <BorderDefault className="p-4 rounded text-center">
            <BodySmall>Default Border</BodySmall>
          </BorderDefault>
          <BorderBrand className="p-4 rounded text-center">
            <BodySmall>Brand Border</BodySmall>
          </BorderBrand>
          <BorderDanger className="p-4 rounded text-center">
            <BodySmall>Danger Border</BodySmall>
          </BorderDanger>
          <BorderWarning className="p-4 rounded text-center">
            <BodySmall>Warning Border</BodySmall>
          </BorderWarning>
          <BorderSuccess className="p-4 rounded text-center">
            <BodySmall>Success Border</BodySmall>
          </BorderSuccess>
          <BorderInfo className="p-4 rounded text-center">
            <BodySmall>Info Border</BodySmall>
          </BorderInfo>
        </div>
      </SurfaceDefault>

      {/* Status Badges */}
      <SurfaceDefault className="p-6 rounded-lg">
        <HeadingLarge className="mb-6">Status Badges</HeadingLarge>
        <div className="flex flex-wrap gap-4">
          <StatusBadge type="success">Completed</StatusBadge>
          <StatusBadge type="warning">Pending</StatusBadge>
          <StatusBadge type="danger">Error</StatusBadge>
          <StatusBadge type="info">Information</StatusBadge>
        </div>
      </SurfaceDefault>

      {/* Card Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="default">
          <HeadingMedium className="mb-2">Default Card</HeadingMedium>
          <BodyMedium>This is a default card with subtle border.</BodyMedium>
        </Card>
        
        <Card variant="brand" border={false}>
          <HeadingMedium className="mb-2">Brand Card</HeadingMedium>
          <BodyMedium>This is a brand card without border.</BodyMedium>
        </Card>
        
        <Card variant="success">
          <HeadingMedium className="mb-2">Success Card</HeadingMedium>
          <BodyMedium>This card indicates a successful operation.</BodyMedium>
        </Card>
        
        <Card variant="danger">
          <HeadingMedium className="mb-2">Danger Card</HeadingMedium>
          <BodyMedium>This card indicates an error or warning.</BodyMedium>
        </Card>
      </div>
    </div>
  );
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility function to combine multiple class names
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Utility function to get text color class based on status
 */
export const getStatusTextColor = (status: 'success' | 'warning' | 'error' | 'info'): string => {
  const colors = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-danger',
    info: 'text-info'
  };
  return colors[status];
};

/**
 * Utility function to get surface color class based on status
 */
export const getStatusSurfaceColor = (status: 'success' | 'warning' | 'error' | 'info'): string => {
  const colors = {
    success: 'surface-success',
    warning: 'surface-warning',
    error: 'surface-danger',
    info: 'surface-info'
  };
  return colors[status];
};

