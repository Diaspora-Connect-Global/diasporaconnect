'use client';

import { useCallback, useRef, useState } from 'react';
import { Play, Pause, Music } from 'lucide-react';

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

interface AudioPlayerProps {
  src: string;
  fileName?: string;
  className?: string;
}

/**
 * Inline audio player for audio attachments — play/pause, scrub, and time,
 * replacing the previous "open in new tab" download row (audio had no player).
 * Seeking logic mirrors the VideoPlayer scrubber for consistency.
 */
export default function AudioPlayer({ src, fileName, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const canSeek = Number.isFinite(duration) && duration > 0;
  const progressPct = canSeek ? (currentTime / duration) * 100 : 0;

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => { /* ignored */ });
    else a.pause();
  }, []);

  const seekToClientX = useCallback((clientX: number) => {
    const a = audioRef.current;
    const track = trackRef.current;
    if (!a || !track || !canSeek) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const time = fraction * duration;
    a.currentTime = time;
    setCurrentTime(time);
  }, [canSeek, duration]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (!canSeek) return;
    scrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  }, [canSeek, seekToClientX]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    seekToClientX(e.clientX);
  }, [seekToClientX]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    scrubbingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  }, []);

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-hover p-3 max-w-full ${className}`}>
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => { if (!scrubbingRef.current) setCurrentTime(e.currentTarget.currentTime); }}
        onEnded={() => setIsPlaying(false)}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-brand text-text-white flex items-center justify-center hover:bg-border-brand transition-colors"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-px" />}
      </button>

      <div className="min-w-0 flex-1">
        {fileName && (
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            <Music className="w-3.5 h-3.5 flex-shrink-0 text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary truncate">{fileName}</span>
          </div>
        )}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`group/seek relative py-2 ${canSeek ? 'cursor-pointer' : 'cursor-default'}`}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={canSeek ? Math.floor(duration) : 0}
          aria-valuenow={Math.floor(currentTime)}
          tabIndex={canSeek ? 0 : -1}
        >
          <div className="relative h-1 rounded-full bg-border-subtle">
            <div className="absolute inset-y-0 left-0 rounded-full bg-surface-brand" style={{ width: `${progressPct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-surface-brand shadow opacity-0 group-hover/seek:opacity-100 transition-opacity"
              style={{ left: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs tabular-nums text-text-tertiary">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
