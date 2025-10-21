interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

export function ButtonType1({ 
  children, 
  onClick, 
  type = "button", 
  disabled = false,
  className = ""
}: ButtonProps) {
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-surface-default 
        border 
        border-text-brand 
        text-text-brand 
        rounded-full 
        font-label-medium 
        ring-text-brand
        cursor-pointer
        hover:bg-border-brand 
        hover:text-text-white 
        transition-colors
        disabled:opacity-50 
        disabled:cursor-not-allowed
        h-fit
        whitespace-nowrap
        ${className}
      `}
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
  className = ""
}: ButtonProps) {
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-surface-brand 
        border 
        border-text-brand 
        text-text-white 
        rounded-full 
        py-1.5 
        px-3
        sm:py-2 
        sm:px-4 
        text-xs
        sm:text-sm
        md:text-base
        font-label-medium 
        ring-text-brand
        cursor-pointer
        hover:bg-border-brand 
        hover:text-text-white 
        transition-colors
        disabled:opacity-50 
        disabled:cursor-not-allowed
        h-fit
        whitespace-nowrap
        ${className}
      `}
    >
      {children}
    </button>
  );
}