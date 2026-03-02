/* eslint-disable @next/next/no-img-element */
"use client";

import { FileIcon, Loader2, Music } from "lucide-react";

export interface SendingPreviewItem {
  url?: string;
  mimeType: string;
}

interface SendingFilesBubbleProps {
  sendingPreviews: SendingPreviewItem[];
  isMe?: boolean;
}

const CELL_CLASS = "relative overflow-hidden bg-surface-hover flex items-center justify-center min-h-[56px]";
const MEDIA_CLASS = "absolute inset-0 w-full h-full object-cover blur-md";

export function SendingFilesBubble({ sendingPreviews }: SendingFilesBubbleProps) {
  const count = sendingPreviews.length;
  const gridCols = count === 1 ? "grid-cols-1" : "grid-cols-2";
  const maxW = "max-w-[220px] sm:max-w-[260px]";

  return (
    <div className={`relative rounded-2xl overflow-hidden ${maxW}`}>
      <div className={`grid ${gridCols} gap-0.5 max-h-64 w-full ${count === 1 ? "aspect-[4/3]" : ""}`}>
        {sendingPreviews.map((preview, i) => (
          <div key={i} className={`${CELL_CLASS} ${count > 1 ? "aspect-square min-h-0" : ""}`}>
            {preview.url && (preview.mimeType.startsWith("image/") || preview.mimeType.startsWith("video/")) ? (
              preview.mimeType.startsWith("image/") ? (
                <img src={preview.url} alt="" className={MEDIA_CLASS} />
              ) : (
                <video src={preview.url} muted playsInline className={MEDIA_CLASS} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 p-2 text-text-tertiary">
                {preview.mimeType.startsWith("audio/") ? (
                  <Music className="w-8 h-8" />
                ) : (
                  <FileIcon className="w-8 h-8" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    </div>
  );
}
