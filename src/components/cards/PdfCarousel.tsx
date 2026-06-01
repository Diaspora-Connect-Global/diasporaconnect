'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, FileText } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

// Set once: serve the worker same-origin (copied to /public/pdfjs by postinstall).
let workerConfigured = false;
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    workerConfigured = true;
  }
  return pdfjs;
}

/** Route the GCS url through our same-origin proxy so pdf.js can fetch bytes without CORS. */
function proxied(url: string): string {
  return `/api/file-proxy?url=${encodeURIComponent(url)}`;
}

export interface PdfCarouselProps {
  url: string;
  fileName: string;
  /** Shown larger (fullscreen modal). Hides the in-card fullscreen button. */
  fullscreen?: boolean;
  /** Called when the user taps the fullscreen button (in-card only). */
  onFullscreen?: () => void;
  className?: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export default function PdfCarousel({
  url,
  fileName,
  fullscreen = false,
  onFullscreen,
  className = '',
}: PdfCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const [shouldLoad, setShouldLoad] = useState(fullscreen);
  const [state, setState] = useState<LoadState>('idle');
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1); // 1-based
  const [containerWidth, setContainerWidth] = useState(0);

  // Lazy-load: only fetch/parse the PDF once the card nears the viewport.
  useEffect(() => {
    if (shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setShouldLoad(true); },
      { rootMargin: '300px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldLoad]);

  // Track container width for crisp rendering at the right scale.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load the document.
  useEffect(() => {
    if (!shouldLoad || !url) return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument(proxied(url));
        const pdf = await task.promise;
        if (cancelled) { pdf.destroy(); return; }
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [shouldLoad, url]);

  // Render the current page whenever it (or the width) changes.
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (state !== 'ready' || !pdf || !canvas || containerWidth <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const scale = (containerWidth / base.width) * dpr;
        const viewport = pdfPage.getViewport({ scale });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        renderTaskRef.current?.cancel();
        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        /* render cancelled or failed — ignore (cancellation is expected on fast nav) */
      }
    })();
    return () => { cancelled = true; };
  }, [state, page, containerWidth]);

  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(numPages, p + 1)), [numPages]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
    touchStartY.current = e.touches[0]!.clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0]!.clientX - touchStartX.current;
    const dy = e.changedTouches[0]!.clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext(); else goPrev();
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Graceful fallback when the PDF can't be loaded/parsed.
  if (state === 'error') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-hover hover:bg-surface-default transition-colors p-3 ${className}`}
      >
        <FileText className="w-6 h-6 flex-shrink-0 text-[#cb3500]" />
        <span className="text-sm font-medium text-text-primary truncate">{fileName}</span>
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={stop}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-subtle select-none ${className}`}
    >
      {/* Page canvas */}
      <div className={`relative w-full ${fullscreen ? 'max-h-[80vh] overflow-auto' : 'max-h-[34rem] overflow-hidden'} flex items-start justify-center bg-surface-default`}>
        <canvas ref={canvasRef} className="block w-full" />
        {state !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center min-h-[12rem]">
            <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
          </div>
        )}
      </div>

      {/* Prev / next arrows (hidden on single-page) */}
      {state === 'ready' && numPages > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { stop(e); goPrev(); }}
            disabled={page <= 1}
            aria-label="Previous page"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/45 text-white hover:bg-black/65 disabled:opacity-0 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); goNext(); }}
            disabled={page >= numPages}
            aria-label="Next page"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/45 text-white hover:bg-black/65 disabled:opacity-0 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-border-subtle bg-surface-default">
        <span className="text-xs font-medium text-text-secondary tabular-nums">
          {state === 'ready' ? `${page} / ${numPages}` : '…'}
        </span>
        <div className="flex-1" />
        {!fullscreen && onFullscreen && (
          <button
            type="button"
            onClick={(e) => { stop(e); onFullscreen(); }}
            aria-label="View fullscreen"
            className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-hover"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName}
          onClick={stop}
          aria-label="Download"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-text-brand hover:bg-surface-hover text-xs font-semibold"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </div>
    </div>
  );
}
