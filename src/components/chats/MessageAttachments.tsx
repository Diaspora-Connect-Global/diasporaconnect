/* eslint-disable @next/next/no-img-element */
"use client";

import type { ReactNode } from "react";
import { FileIcon, Music } from "lucide-react";

export interface MessageAttachmentItem {
  gcsPath?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SingleAttachment({ att, inGrid }: { att: MessageAttachmentItem; inGrid?: boolean }) {
  const url = att.gcsPath;
  const mime = (att.mimeType ?? "").toLowerCase();
  const name = att.fileName ?? "file";
  const wrap = (className: string, children: ReactNode) => (
    <div className={inGrid ? className : `mb-2 ${className}`}>{children}</div>
  );

  if (!url) return null;

  if (mime.startsWith("image/")) {
    return wrap(
      inGrid ? "rounded-lg overflow-hidden aspect-square bg-surface-hover" : "",
      <img
        src={url}
        alt={name}
        className={inGrid ? "w-full h-full object-cover rounded-lg" : "rounded-2xl max-w-full h-auto max-h-80 object-contain"}
      />
    );
  }

  if (mime.startsWith("video/")) {
    return wrap(
      inGrid ? "rounded-lg overflow-hidden aspect-square bg-black/10" : "rounded-2xl overflow-hidden max-w-full bg-black/10",
      <video
        src={url}
        controls
        className={inGrid ? "w-full h-full object-cover rounded-lg max-h-32" : "max-w-full max-h-80 w-full"}
        preload="metadata"
      />
    );
  }

  if (mime.startsWith("audio/")) {
    return wrap(
      "flex items-center gap-2 rounded-2xl bg-surface-hover p-2 max-w-full",
      <>
        <Music className="w-8 h-8 flex-shrink-0 text-text-brand" />
        <audio src={url} controls className="flex-1 min-w-0 max-w-full" preload="metadata" />
      </>
    );
  }

  // PDF, text, Office, etc. — file card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-hover hover:bg-surface-default transition-colors max-w-full ${inGrid ? "p-2" : "mb-2 p-3"}`}
    >
      <FileIcon className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 text-text-tertiary" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-text-primary truncate block">{name}</span>
        {att.fileSize != null && att.fileSize > 0 && (
          <span className="text-xs text-text-tertiary">{formatFileSize(att.fileSize)}</span>
        )}
      </div>
    </a>
  );
}

export function MessageAttachments({
  attachments,
  legacyContentUrl,
}: {
  attachments?: MessageAttachmentItem[];
  legacyContentUrl?: string | null;
}) {
  const list = attachments?.length
    ? attachments
    : legacyContentUrl
      ? [{ gcsPath: legacyContentUrl, mimeType: "image/jpeg" }]
      : [];

  if (!list.length) return null;

  const isGrid = list.length >= 2;
  const gridCols = list.length >= 5 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div
      className={
        isGrid
          ? `grid ${gridCols} gap-1.5 max-w-[220px] sm:max-w-[260px] max-h-72 overflow-y-auto`
          : "space-y-1"
      }
    >
      {list.map((att, i) => (
        <div key={att.gcsPath ?? i} className={isGrid ? "min-w-0" : undefined}>
          <SingleAttachment att={att} inGrid={isGrid} />
        </div>
      ))}
    </div>
  );
}
