/**
 * Shared display helpers for file/document attachments (chat + posts).
 */

import {
  FileIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  Music,
  type LucideIcon,
} from 'lucide-react';

/** Human-readable file size. Returns '' for missing/zero so callers can omit it. */
export function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FileTypeMeta {
  Icon: LucideIcon;
  /** Tailwind text-color class for the icon. */
  color: string;
}

function getExtension(fileName?: string): string {
  if (!fileName) return '';
  const seg = fileName.split('?')[0]?.split('/').pop() ?? '';
  return seg.includes('.') ? (seg.split('.').pop() ?? '').toLowerCase() : '';
}

/**
 * Maps a mimeType (with filename fallback) to a lucide icon + color class.
 * Mirrors the color treatment used by the create-post composer's getAttachmentIcon.
 */
export function getFileTypeMeta(mimeType?: string, fileName?: string): FileTypeMeta {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = getExtension(fileName);

  if (mime.startsWith('audio/')) return { Icon: Music, color: 'text-text-brand' };

  if (mime === 'application/pdf' || ext === 'pdf') {
    return { Icon: FileText, color: 'text-[#cb3500]' };
  }
  if (mime.includes('word') || ext === 'doc' || ext === 'docx' || ext === 'rtf' || ext === 'odt') {
    return { Icon: FileText, color: 'text-[#2b579a]' };
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv' ||
    ['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(ext)
  ) {
    return { Icon: FileSpreadsheet, color: 'text-[#217346]' };
  }
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['ppt', 'pptx', 'odp', 'key'].includes(ext)
  ) {
    return { Icon: Presentation, color: 'text-[#d24726]' };
  }

  return { Icon: FileIcon, color: 'text-text-tertiary' };
}
