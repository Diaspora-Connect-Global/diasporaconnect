'use client';

import { formatFileSize, getFileTypeMeta } from '@/lib/fileDisplay';

export interface FileAttachmentCardProps {
  url: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  className?: string;
}

/**
 * Canonical file-card for a document/audio attachment on a post.
 * Icon (file-type colored) + filename + human-readable size; opens in a new tab.
 */
export default function FileAttachmentCard({
  url,
  fileName,
  mimeType,
  size,
  className = '',
}: FileAttachmentCardProps) {
  if (!url) return null;
  const { Icon, color } = getFileTypeMeta(mimeType, fileName);
  const sizeLabel = formatFileSize(size);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-hover hover:bg-surface-default transition-colors max-w-full p-3 ${className}`}
    >
      <Icon className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-text-primary truncate block">{fileName}</span>
        {sizeLabel && <span className="text-xs text-text-tertiary">{sizeLabel}</span>}
      </div>
    </a>
  );
}
