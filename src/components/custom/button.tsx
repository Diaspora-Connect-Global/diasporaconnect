import React from "react";

/** Consistent padding: default = px-4 py-2, lg = px-6 py-3, iconSm = small icon-only (e.g. close on thumbnails) */
const sizeClasses = {
  default: "px-4 py-2",
  lg: "px-6 py-3",
  iconSm: "p-0.5 min-w-0 w-6 h-6 flex items-center justify-center",
} as const;

interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "className"
  > {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  /** Button padding size; use "lg" for dialogs and primary CTAs */
  size?: keyof typeof sizeClasses;
}

const baseButtonClass = `
  rounded-full font-label-medium cursor-pointer transition-colors
  disabled:opacity-50 disabled:cursor-not-allowed h-fit w-fit whitespace-nowrap
`;

export function ButtonType1({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  size = "default",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-surface-default border border-text-brand text-text-brand ring-text-brand
        ${baseButtonClass} ${sizeClasses[size]} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonType2({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  size = "default",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-surface-brand border text-text-white
        text-xs sm:text-sm md:text-base
        hover:bg-border-brand hover:text-text-white
        disabled:text-text-primary disabled:bg-surface-disabled
        ${baseButtonClass} ${sizeClasses[size]} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}

export const ButtonType3 = React.forwardRef<HTMLButtonElement, ButtonProps>(function ButtonType3(
  { children, onClick, type = "button", disabled = false, className = "", size = "default", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-transparent text-text-brand ring-text-brand
        ${baseButtonClass} ${sizeClasses[size]} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
});

export function ButtonType4Pill({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  size = "default",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-surface-danger text-text-danger ring-text-danger
        ${baseButtonClass} ${sizeClasses[size]} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}