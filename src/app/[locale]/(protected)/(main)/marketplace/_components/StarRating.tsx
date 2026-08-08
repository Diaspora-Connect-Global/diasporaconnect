"use client";

import React from "react";
import { Star } from "lucide-react";

/**
 * Star display and star input in one component — they are the same visual and
 * differ only in whether the stars react to the pointer.
 *
 * `value` may be fractional for display (an average of 4.3 fills four stars and
 * 30% of the fifth); the interactive variant only ever reports whole stars.
 */
export function StarRating({
  value,
  size = 16,
  onChange,
  label,
}: {
  value: number;
  size?: number;
  onChange?: (rating: number) => void;
  label?: string;
}) {
  const interactive = typeof onChange === "function";
  const [hovered, setHovered] = React.useState<number | null>(null);
  const shown = hovered ?? value;

  const stars = [1, 2, 3, 4, 5].map((position) => {
    // Fraction of THIS star that should be filled, 0–1.
    const fill = Math.max(0, Math.min(1, shown - (position - 1)));

    const star = (
      <span
        key={position}
        className="relative inline-block shrink-0"
        style={{ width: size, height: size }}
      >
        <Star size={size} className="absolute inset-0 text-gray-300" aria-hidden="true" />
        {fill > 0 && (
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${fill * 100}%` }}
            aria-hidden="true"
          >
            <Star size={size} className="text-amber-400 fill-amber-400" />
          </span>
        )}
      </span>
    );

    if (!interactive) return star;

    return (
      <button
        key={position}
        type="button"
        onClick={() => onChange?.(position)}
        onMouseEnter={() => setHovered(position)}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered(position)}
        onBlur={() => setHovered(null)}
        aria-label={`${position}`}
        aria-pressed={value === position}
        className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        {star}
      </button>
    );
  });

  return (
    <span
      className="inline-flex items-center gap-0.5"
      role={interactive ? "group" : "img"}
      aria-label={interactive ? label : label ?? `${value}/5`}
    >
      {stars}
    </span>
  );
}
