"use client";

import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

import { EmptyState } from "./EmptyState";

export interface NoResultsProps {
  query?: string;
  /** Already-translated title. If omitted, caller should pass one. */
  title?: string;
  description?: string;
  suggestion?: string;
  onTrySuggestion?: (q: string) => void;
  /** Pre-formatted label, e.g. 'Try "X" instead'. */
  suggestionLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function NoResults({
  query,
  title,
  description,
  suggestion,
  onTrySuggestion,
  suggestionLabel,
  size = "md",
  className,
}: NoResultsProps) {
  const showSuggestion = Boolean(suggestion && onTrySuggestion);

  return (
    <EmptyState
      icon={SearchX}
      title={title ?? query ?? ""}
      description={description}
      size={size}
      className={className}
    >
      {showSuggestion ? (
        <button
          type="button"
          onClick={() => onTrySuggestion!(suggestion!)}
          className={cn(
            "px-4 py-1.5 rounded-full bg-text-brand/10 text-text-brand text-sm font-medium hover:bg-text-brand/20 transition-colors"
          )}
        >
          {suggestionLabel ?? suggestion}
        </button>
      ) : null}
    </EmptyState>
  );
}
