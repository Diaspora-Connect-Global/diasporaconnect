'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import Image from 'next/image';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Returns buffered ranges as an array of [start%, end%] pairs relative to duration. */
function getBufferedRanges(video: HTMLVideoElement): Array<[number, number]> {
  if (!video.duration) return [];
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push([
      (video.buffered.start(i) / video.duration) * 100,
      (video.buffered.end(i) / video.duration) * 100,
    ]);
  }
  return ranges;
}

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  /** Pause automatically when the player scrolls out of the viewport */
  pauseOnLeave?: boolean;
}

export function VideoPlayer({ src, className, autoPlay = false, pauseOnLeave = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [shouldLoad, setShouldLoad] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedRanges, setBufferedRanges] = useState<Array<[number, number]>>([]);
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

  // Lazy-load: only attach src once the player is near the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setShouldLoad(true); },
      { rootMargin: '150px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const updateBuffered = useCallback(() => {
    const v = videoRef.current;
    if (v) setBufferedRanges(getBufferedRanges(v));
  }, []);

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
    updateBuffered();
  }, [clearConnectionTimers, updateBuffered]);

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
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
  }, []);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    const bar = progressBarRef.current;
    if (!v || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
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
        className="w-full h-full object-contain"
        onPlay={() => { setIsPlaying(true); setHasError(false); scheduleHide(); }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }}
        onTimeUpdate={() => {
          setCurrentTime(videoRef.current?.currentTime ?? 0);
          updateBuffered();
        }}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onProgress={updateBuffered}
        onStalled={handleStalled}
        onError={handleError}
        onEnded={() => { setIsPlaying(false); setShowControls(true); setCurrentTime(0); }}
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
          {/* Progress bar */}
          <div
            ref={progressBarRef}
            className="w-full h-1 rounded-full bg-white/20 cursor-pointer mb-2.5 relative group/bar"
            onClick={seekTo}
          >
            {/* Buffered ranges */}
            {bufferedRanges.map(([start, end], i) => (
              <div
                key={i}
                className="absolute h-full rounded-full bg-white/30"
                style={{ left: `${start}%`, width: `${end - start}%` }}
              />
            ))}
            {/* Playback progress */}
            <div
              className="absolute h-full rounded-full bg-text-brand transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* Scrubber dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity"
              style={{ left: `${progress}%` }}
            />
          </div>

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

            <span className="text-white/75 text-xs tabular-nums flex-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={toggleMute}
              className="text-white hover:text-text-brand transition-colors p-0.5 shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
