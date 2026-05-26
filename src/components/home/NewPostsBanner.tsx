'use client';

import React from 'react';

/**
 * "X new posts available" pill that appears above the home feed when
 * `unseenFeedCount > 0`. Click → caller triggers a fresh refresh AND
 * scrolls to the top of the feed.
 *
 * Stays visually unobtrusive (a single pill, not a full-width banner)
 * so the user can scroll past it without dismissing.
 */
export interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
}

export const NewPostsBanner: React.FC<NewPostsBannerProps> = ({ count, onClick }) => {
  if (count <= 0) return null;
  const label = count >= 99 ? '99+ new posts' : count === 1 ? '1 new post' : `${count} new posts`;

  return (
    <div className="sticky top-0 z-20 flex justify-center pointer-events-none py-2">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-full shadow-md transition-colors flex items-center gap-2"
        aria-label={label}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        {label}
      </button>
    </div>
  );
};
