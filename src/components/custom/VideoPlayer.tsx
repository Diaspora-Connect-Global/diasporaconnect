'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { useVideoStore } from '@/store/useVideoStore';

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  /** Pause automatically when the player scrolls out of the viewport */
  pauseOnLeave?: boolean;
}

export function VideoPlayer({ src, className, autoPlay = true, pauseOnLeave = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { globalMuted, setGlobalMuted } = useVideoStore();

  const [shouldLoad, setShouldLoad] = useState(autoPlay);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
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
  useEffect(() => {
    if (autoPlay) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setShouldLoad(true); },
      { rootMargin: '150px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoPlay]);

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

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Sync global mute state to the video element
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const startConnectionTimers = useCallback(() => {
    clearConnectionTimers();
    // 8s → show "Loading slowly…" under the spinner
    slowTimerRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 4) {
        setSlowConnection(true);
      }
    }, 8000);
    // 20s → escalate to error state with retry
    deadTimerRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 4) {
        setIsBuffering(false);
        setSlowConnection(false);
        setIsPlaying(false);
        setHasError(true);
      }
    }, 20000);
  }, [clearConnectionTimers]);

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

  const handleError = useCallback(() => {
    setIsBuffering(false);
    setSlowConnection(false);
    setIsPlaying(false);
    setHasError(true);
    clearConnectionTimers();
  }, [clearConnectionTimers]);

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
    setRetryCount((c) => c + 1);
    v.load();
    v.play().catch(() => { setIsBuffering(false); });
  }, []);

  // Clear timers on unmount
  useEffect(() => clearConnectionTimers, [clearConnectionTimers]);

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

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
  }, []);

  const controlsVisible = showControls || !isPlaying;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden cursor-pointer select-none ${className ?? ''}`}
      onMouseMove={revealControls}
      onMouseLeave={() => isPlaying && scheduleHide()}
      onClick={togglePlay}
      onContextMenu={handleContextMenu}
    >
      <video
        ref={videoRef}
        key={retryCount}
        src={shouldLoad ? src : undefined}
        preload="auto"
        playsInline
        autoPlay={autoPlay}
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
          {/* Button row */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 fill-white" />
                : <Play className="w-4 h-4 fill-white translate-x-px" />
              }
            </button>

            <div className="flex-1" />

            <button
              onClick={toggleMute}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0"
            >
              {globalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
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
