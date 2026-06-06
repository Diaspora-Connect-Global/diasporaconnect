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
  /** Real, clickable alternative terms shown as a chip row. Takes precedence over `suggestion`. */
  suggestions?: string[];
  /** Heading shown above the chip row, e.g. "Try searching for:". */
  suggestionsLabel?: string;
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
  suggestions,
  suggestionsLabel,
  size = "md",
  className,
}: NoResultsProps) {
  const showChips = Boolean(suggestions?.length && onTrySuggestion);
  const showSuggestion = !showChips && Boolean(suggestion && onTrySuggestion);

  return (
    <EmptyState
      icon={SearchX}
      title={title ?? query ?? ""}
      description={description}
      size={size}
      className={className}
    >
      {showChips ? (
        <div className="flex flex-col items-center gap-2">
          {suggestionsLabel ? (
            <p className="text-text-secondary text-sm">{suggestionsLabel}</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions!.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onTrySuggestion!(term)}
                className="px-3 py-1.5 rounded-full border border-border-subtle text-text-secondary text-sm hover:bg-surface-hover transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : showSuggestion ? (
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
