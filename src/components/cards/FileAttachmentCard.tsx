'use client';

import { useState } from 'react';
import { ChevronDown, Maximize2, ExternalLink } from 'lucide-react';
import {
  formatFileSize,
  getFileTypeMeta,
  getDocViewerKind,
  buildOfficeEmbedUrl,
} from '@/lib/fileDisplay';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export interface FileAttachmentCardProps {
  url: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  className?: string;
}

/** The actual embedded viewer (iframe) for a given document kind. */
function DocViewerFrame({
  kind,
  url,
  fileName,
  className = '',
}: {
  kind: 'pdf' | 'office' | 'text';
  url: string;
  fileName: string;
  className?: string;
}) {
  if (kind === 'office') {
    return (
      <iframe
        src={buildOfficeEmbedUrl(url)}
        title={fileName}
        className={`w-full h-full border-0 ${className}`}
      />
    );
  }
  // pdf / text — browser-native rendering, with a download fallback.
  return (
    <object data={url} type={kind === 'pdf' ? 'application/pdf' : 'text/plain'} className={`w-full h-full ${className}`}>
      <iframe src={url} title={fileName} className="w-full h-full border-0" />
    </object>
  );
}

/**
 * Canonical file-card for a document/audio attachment on a post.
 * Icon (file-type colored) + filename + size. Viewable documents (PDF, Office,
 * text) expand into an inline viewer and can open fullscreen; other types open
 * in a new tab.
 */
export default function FileAttachmentCard({
  url,
  fileName,
  mimeType,
  size,
  className = '',
}: FileAttachmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  if (!url) return null;
  const { Icon, color } = getFileTypeMeta(mimeType, fileName);
  const sizeLabel = formatFileSize(size);
  const viewerKind = getDocViewerKind(mimeType, fileName);
  const canView = viewerKind !== 'unsupported';

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className={`max-w-full ${className}`} onClick={stop}>
      {/* Header row */}
      <div
        className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-hover transition-colors p-3 ${
          canView ? 'cursor-pointer hover:bg-surface-default' : ''
        } ${expanded ? 'rounded-b-none' : ''}`}
        onClick={canView ? () => setExpanded((v) => !v) : undefined}
        role={canView ? 'button' : undefined}
        tabIndex={canView ? 0 : undefined}
        onKeyDown={
          canView
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpanded((v) => !v);
                }
              }
            : undefined
        }
      >
        <Icon className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${color}`} />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-text-primary truncate block">{fileName}</span>
          {sizeLabel && <span className="text-xs text-text-tertiary">{sizeLabel}</span>}
        </div>

        {/* Open in new tab / download — always available */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          aria-label="Open in new tab"
          className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-default flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {canView && (
          <ChevronDown
            className={`w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {/* Inline viewer */}
      {canView && expanded && (
        <div className="relative border border-t-0 border-border-subtle rounded-b-xl overflow-hidden bg-surface-subtle">
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setFullscreen(true);
            }}
            aria-label="View fullscreen"
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-surface-default/90 border border-border-subtle text-text-secondary hover:text-text-primary shadow-sm"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-full h-[480px]">
            <DocViewerFrame kind={viewerKind as 'pdf' | 'office' | 'text'} url={url} fileName={fileName} />
          </div>
        </div>
      )}

      {/* Fullscreen modal */}
      {canView && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col">
            <DialogTitle className="px-4 py-3 border-b border-border-subtle text-base truncate pr-10">
              {fileName}
            </DialogTitle>
            <div className="flex-1 min-h-0">
              <DocViewerFrame kind={viewerKind as 'pdf' | 'office' | 'text'} url={url} fileName={fileName} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
