'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, FileText } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

// Set once: serve the worker same-origin (copied to /public/pdfjs by prebuild).
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
  /** Shown larger (fullscreen modal). Hides the in-card fullscreen button & disables the peek. */
  fullscreen?: boolean;
  /** Called when the user taps the fullscreen button (in-card only). */
  onFullscreen?: () => void;
  className?: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const GAP_PX = 8;

export default function PdfCarousel({
  url,
  fileName,
  fullscreen = false,
  onFullscreen,
  className = '',
}: PdfCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedRef = useRef<Set<number>>(new Set());
  const renderTasksRef = useRef<Map<number, RenderTask>>(new Map());
  const lastWidthRef = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const [shouldLoad, setShouldLoad] = useState(fullscreen);
  const [state, setState] = useState<LoadState>('idle');
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1); // 1-based
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspect, setAspect] = useState(1.414); // height/width; default A4 portrait

  // LinkedIn-style peek inline; full width in the fullscreen modal.
  const slidePct = fullscreen ? 1 : 0.9;
  const slideW = containerWidth > 0 ? containerWidth * slidePct - (fullscreen ? 0 : GAP_PX) : 0;
  const deckHeight = slideW > 0 ? slideW * aspect : 0;

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
        // Aspect from the first page so the strip doesn't jump.
        try {
          const first = await pdf.getPage(1);
          const vp = first.getViewport({ scale: 1 });
          if (!cancelled) setAspect(vp.height / vp.width);
        } catch { /* keep default */ }
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    const tasks = renderTasksRef.current;
    return () => {
      cancelled = true;
      tasks.forEach((t) => t.cancel());
      tasks.clear();
      renderedRef.current.clear();
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [shouldLoad, url]);

  // Render the visible window of pages (current ± 1) to their canvases.
  useEffect(() => {
    const pdf = pdfRef.current;
    if (state !== 'ready' || !pdf || slideW <= 0) return;
    // Width changed → previously-rendered canvases are the wrong size; redo them.
    if (lastWidthRef.current !== slideW) {
      lastWidthRef.current = slideW;
      renderedRef.current.clear();
    }
    let cancelled = false;
    const windowPages = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= numPages);
    (async () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      for (const p of windowPages) {
        if (cancelled) return;
        const canvas = canvasMapRef.current.get(p);
        if (!canvas || renderedRef.current.has(p)) continue;
        try {
          const pdfPage = await pdf.getPage(p);
          if (cancelled) return;
          const base = pdfPage.getViewport({ scale: 1 });
          const viewport = pdfPage.getViewport({ scale: (slideW / base.width) * dpr });
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          renderTasksRef.current.get(p)?.cancel();
          const task = pdfPage.render({ canvas, canvasContext: ctx, viewport });
          renderTasksRef.current.set(p, task);
          await task.promise;
          renderedRef.current.add(p);
        } catch {
          /* cancelled or failed — fine */
        }
      }
    })();
    return () => { cancelled = true; };
  }, [state, page, numPages, slideW]);

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

  const multi = numPages > 1;
  const trackX = slideW > 0 ? -(page - 1) * (slideW + GAP_PX) : 0;

  return (
    <div ref={containerRef} onClick={stop} className={`w-full select-none ${className}`}>
      {/* Deck viewport */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-subtle"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ height: deckHeight || undefined, minHeight: deckHeight ? undefined : '12rem' }}
      >
        {state !== 'ready' || slideW <= 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
          </div>
        ) : (
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ gap: `${GAP_PX}px`, transform: `translateX(${trackX}px)` }}
          >
            {Array.from({ length: numPages }, (_, i) => {
              const p = i + 1;
              return (
                <div
                  key={p}
                  className="relative flex-shrink-0 h-full overflow-hidden rounded-lg bg-white shadow-sm"
                  style={{ width: slideW }}
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasMapRef.current.set(p, el);
                      else canvasMapRef.current.delete(p);
                    }}
                    className="block w-full h-full"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Page-count pill */}
        {state === 'ready' && (
          <div className="absolute top-2 right-2 rounded-full bg-black/55 px-2.5 py-1">
            <span className="text-white text-xs font-medium tabular-nums">{page} / {numPages}</span>
          </div>
        )}

        {/* Fullscreen (in-card only) */}
        {state === 'ready' && !fullscreen && onFullscreen && (
          <button
            type="button"
            onClick={(e) => { stop(e); onFullscreen(); }}
            aria-label="View fullscreen"
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/45 text-white hover:bg-black/65 transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Prev / next arrows */}
        {state === 'ready' && multi && (
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
      </div>

      {/* Prominent centered Download */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        onClick={stop}
        className="mt-2 flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-text-brand hover:bg-surface-hover font-semibold text-sm transition-colors"
      >
        <Download className="w-5 h-5" />
        Download
      </a>
    </div>
  );
}
