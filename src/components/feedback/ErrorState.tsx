"use client";

import { AlertTriangle, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { EmptyState } from "./EmptyState";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
  retryLabel?: string;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Please try again.",
  onRetry,
  retrying = false,
  retryLabel = "Try again",
  icon: Icon = AlertTriangle,
  size = "md",
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={Icon}
      iconClassName="text-text-danger"
      title={title}
      description={description}
      size={size}
      className={className}
      action={
        onRetry ? (
          <Button
            variant="outline"
            size="sm"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? <Spinner className="mr-2" /> : null}
            {retryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
