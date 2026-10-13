/**
 * One-time browser location read. Called ONLY after the person has agreed in the
 * consent dialog, and only once per share: it is never `watchPosition`, because a
 * pin is a snapshot, not tracking. Nothing here stores or logs the position.
 */

export interface Position {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export type LocateFailureReason = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export class LocateError extends Error {
  readonly reason: LocateFailureReason;
  constructor(reason: LocateFailureReason) {
    super(reason);
    this.reason = reason;
  }
}

export type Locate = () => Promise<Position>;

export const browserLocate: Locate = () =>
  new Promise<Position>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LocateError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracyMeters: Math.max(1, Math.round(p.coords.accuracy || 0)) }),
      (e) => reject(new LocateError(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });

export function locateReason(err: unknown): LocateFailureReason {
  return err instanceof LocateError ? err.reason : 'unavailable';
}
