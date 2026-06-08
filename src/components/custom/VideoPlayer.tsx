'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, RefreshCw, WifiOff, Rewind, FastForward } from 'lucide-react';
import Image from 'next/image';
import { useVideoStore } from '@/store/useVideoStore';

const MAX_AUTO_RETRIES = 3;
const AUTO_RETRY_DELAYS = [2000, 5000, 10000] as const;
const SKIP_SECONDS = 10;

/** Seconds → m:ss (or h:mm:ss). Returns 0:00 for NaN/Infinity. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  /** Pause automatically when the player scrolls out of the viewport */
  pauseOnLeave?: boolean;
  /**
   * Facebook/LinkedIn-style feed behaviour: don't play on mount; start muted
   * playback only once the player is ≥60% in view, and pause when it scrolls
   * away (resuming again on re-entry). Overrides `autoPlay` for the initial
   * mount. Use in feed cards; leave off in the lightbox (which uses `autoPlay`).
   */
  autoplayInView?: boolean;
  /** First-frame thumbnail shown while the video loads */
  poster?: string;
  /** Called when the user taps the video to open the full post modal. When provided, click navigates to modal instead of toggling play. */
  onOpenModal?: () => void;
}

export function VideoPlayer({ src, className, autoPlay = true, pauseOnLeave = true, autoplayInView = false, poster, onOpenModal }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { globalMuted, setGlobalMuted } = useVideoStore();

  // When `autoplayInView` is set we never play on mount — the in-view observer
  // drives playback instead — so the <video> element's own autoPlay stays off.
  const elementAutoPlay = autoPlay && !autoplayInView;

  const [shouldLoad, setShouldLoad] = useState(elementAutoPlay);
  // preload="metadata" until in-viewport, then upgrade to "auto"
  const [preloadMode, setPreloadMode] = useState<'metadata' | 'auto'>(elementAutoPlay ? 'auto' : 'metadata');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isScrubbingRef = useRef(false);
  const seekTrackRef = useRef<HTMLDivElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [watermarkKey, setWatermarkKey] = useState<number | null>(null);

  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearConnectionTimers = useCallback(() => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    if (deadTimerRef.current) clearTimeout(deadTimerRef.current);
    slowTimerRef.current = null;
    deadTimerRef.current = null;
  }, []);

  // Lazy-load: only attach src once the player is near the viewport.
  // Skipped when autoPlay is true because shouldLoad starts as true already.
  // Also upgrades preload from "metadata" → "auto" on viewport entry so the
  // browser starts buffering just before the user is likely to play.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          setPreloadMode('auto');
        }
      },
      { rootMargin: '150px', threshold: 0 }
    );
    if (!elementAutoPlay) obs.observe(el);
    return () => obs.disconnect();
  }, [elementAutoPlay]);

  // Auto-pause when mostly out of view
  useEffect(() => {
    if (!pauseOnLeave) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (!entry?.isIntersecting) videoRef.current?.pause(); },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pauseOnLeave]);

  // Feed autoplay: play (muted) once ≥60% in view, pause when it leaves —
  // resuming again on re-entry. Only auto-plays while globally muted so we
  // never force sound; a browser-blocked play() is swallowed harmlessly.
  useEffect(() => {
    if (!autoplayInView) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setShouldLoad(true);
          setPreloadMode('auto');
          if (globalMuted && v) v.play().catch(() => { /* autoplay blocked */ });
        } else {
          v?.pause();
        }
      },
      { threshold: [0, 0.6] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoplayInView, globalMuted]);

  // Sync global mute state to the video element
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isScrubbingRef.current) setShowControls(false);
    }, 3000);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  // Shared auto-retry logic used by both the video error event and the dead-connection timer.
  const triggerAutoRetry = useCallback(() => {
    setIsBuffering(false);
    setSlowConnection(false);
    setIsPlaying(false);
    clearConnectionTimers();
    setAutoRetryCount((count) => {
      if (count < MAX_AUTO_RETRIES) {
        const delay = AUTO_RETRY_DELAYS[count] ?? 10000;
        autoRetryTimerRef.current = setTimeout(() => {
          const v = videoRef.current;
          if (!v) return;
          setIsBuffering(true);
          setHasError(false);
          setRetryCount((c) => c + 1);
          v.load();
          v.play().catch(() => setIsBuffering(false));
        }, delay);
        return count + 1;
      }
      setHasError(true);
      return count;
    });
  }, [clearConnectionTimers]);

  const startConnectionTimers = useCallback(() => {
    clearConnectionTimers();
    // 8s → show "Loading slowly…" under the spinner
    slowTimerRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 4) setSlowConnection(true);
    }, 8000);
    // 12s → escalate to auto-retry / error state
    deadTimerRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 4) triggerAutoRetry();
    }, 12000);
  }, [clearConnectionTimers, triggerAutoRetry]);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
    startConnectionTimers();
  }, [startConnectionTimers]);

  const handleCanPlay = useCallback(() => {
    setIsBuffering(false);
    setSlowConnection(false);
    setHasError(false);
    clearConnectionTimers();
  }, [clearConnectionTimers]);

  const handleError = triggerAutoRetry;

  const handleStalled = useCallback(() => {
    setIsBuffering(true);
    startConnectionTimers();
  }, [startConnectionTimers]);

  const retry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    setHasError(false);
    setSlowConnection(false);
    setIsBuffering(true);
    setAutoRetryCount(0);
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    setRetryCount((c) => c + 1);
    v.load();
    v.play().catch(() => { setIsBuffering(false); });
  }, []);

  // Clear timers on unmount
  useEffect(() => () => {
    clearConnectionTimers();
    if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
  }, [clearConnectionTimers]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setWatermarkKey(Date.now());
  }, []);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasError) return;
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, [hasError]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setGlobalMuted(!globalMuted);
  }, [globalMuted, setGlobalMuted]);

  const canSeek = Number.isFinite(duration) && duration > 0;

  const skip = useCallback((delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !canSeek) return;
    v.currentTime = Math.min(duration, Math.max(0, v.currentTime + delta));
    setCurrentTime(v.currentTime);
    revealControls();
  }, [canSeek, duration, revealControls]);

  /** Map a pointer x-position to a time and seek to it. */
  const seekToClientX = useCallback((clientX: number) => {
    const v = videoRef.current;
    const track = seekTrackRef.current;
    if (!v || !track || !canSeek) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const time = fraction * duration;
    v.currentTime = time;
    setCurrentTime(time);
  }, [canSeek, duration]);

  const handleSeekPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (!canSeek) return;
    isScrubbingRef.current = true;
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  }, [canSeek, seekToClientX]);

  const handleSeekPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    seekToClientX(e.clientX);
  }, [seekToClientX]);

  const handleSeekPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    isScrubbingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    scheduleHide();
  }, [scheduleHide]);

  const controlsVisible = showControls || !isPlaying;
  const progressPct = canSeek ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden cursor-pointer select-none ${className ?? ''}`}
      onMouseMove={revealControls}
      onMouseLeave={() => isPlaying && scheduleHide()}
      onClick={onOpenModal ?? togglePlay}
      onContextMenu={handleContextMenu}
    >
      <video
        ref={videoRef}
        key={retryCount}
        src={shouldLoad ? src : undefined}
        preload={preloadMode}
        poster={poster}
        playsInline
        autoPlay={elementAutoPlay}
        muted={globalMuted}
        className="w-full h-full object-contain"
        onPlay={() => { setIsPlaying(true); setHasError(false); scheduleHide(); }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onStalled={handleStalled}
        onError={handleError}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => { if (!isScrubbingRef.current) setCurrentTime(e.currentTarget.currentTime); }}
        onEnded={() => { setIsPlaying(false); setShowControls(true); }}
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <WifiOff className="w-8 h-8 text-white/60" />
          <p className="text-white/70 text-sm">Could not load video</p>
          <button
            onClick={retry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Buffering spinner */}
      {isBuffering && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Loader2 className="w-10 h-10 text-white animate-spin opacity-75" />
          {slowConnection && (
            <p className="text-white/60 text-xs">Loading slowly…</p>
          )}
        </div>
      )}

      {/* Duration badge (top-right) — shown while the video is idle, like FB/IG. */}
      {canSeek && !isPlaying && !isBuffering && !hasError && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs tabular-nums pointer-events-none select-none">
          {formatTime(currentTime > 0 ? duration - currentTime : duration)}
        </div>
      )}

      {/* Centre play button when paused and not buffering */}
      {!isPlaying && !isBuffering && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {!hasError && (
        <div
          className={`absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-200 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Seek bar */}
          <div
            ref={seekTrackRef}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handleSeekPointerDown}
            onPointerMove={handleSeekPointerMove}
            onPointerUp={handleSeekPointerUp}
            onPointerCancel={handleSeekPointerUp}
            className={`group/seek relative py-2 ${canSeek ? 'cursor-pointer' : 'cursor-default'}`}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={canSeek ? Math.floor(duration) : 0}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={canSeek ? 0 : -1}
          >
            <div className="relative h-1 rounded-full bg-white/30">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-text-brand"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-text-brand shadow opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Button row */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenModal ?? togglePlay}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 fill-white" />
                : <Play className="w-4 h-4 fill-white translate-x-px" />
              }
            </button>

            <button
              onClick={skip(-SKIP_SECONDS)}
              disabled={!canSeek}
              aria-label={`Rewind ${SKIP_SECONDS} seconds`}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0 disabled:opacity-40"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={skip(SKIP_SECONDS)}
              disabled={!canSeek}
              aria-label={`Forward ${SKIP_SECONDS} seconds`}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0 disabled:opacity-40"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <span className="text-white text-xs tabular-nums ml-1 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={toggleMute}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0"
            >
              {globalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Watermark — appears when user right-clicks to download */}
      {watermarkKey !== null && (
        <div
          key={watermarkKey}
          className="watermark-rise absolute right-3 pointer-events-none"
          onAnimationEnd={() => setWatermarkKey(null)}
        >
          <Image
            src="/LOGONEW.png"
            alt="diaspoplug"
            width={90}
            height={24}
            className="opacity-80 drop-shadow-md"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
