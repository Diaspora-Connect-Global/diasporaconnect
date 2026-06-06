import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  /** Override the icon tint (defaults to text-text-tertiary). */
  iconClassName?: string;
  title: string;
  description?: string;
  /** CTA slot rendered below the description. */
  action?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const sizeStyles = {
  sm: {
    container: "py-8",
    wrapper: "w-10 h-10",
    icon: "w-8 h-8",
  },
  md: {
    container: "py-12 sm:py-16",
    wrapper: "w-16 h-16",
    icon: "w-12 h-12",
  },
  lg: {
    container: "min-h-[60vh] py-16",
    wrapper: "w-20 h-20",
    icon: "w-16 h-16",
  },
} as const;

export function EmptyState({
  icon: Icon,
  iconClassName,
  title,
  description,
  action,
  size = "md",
  className,
  children,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4",
        styles.container,
        className
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "mb-4 rounded-full bg-surface-subtle flex items-center justify-center",
            styles.wrapper
          )}
        >
          <Icon className={cn(styles.icon, "text-text-tertiary", iconClassName)} />
        </div>
      ) : null}
      <h3 className="text-text-primary font-medium">{title}</h3>
      {description ? (
        <p className="mt-1 text-text-secondary text-sm max-w-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
