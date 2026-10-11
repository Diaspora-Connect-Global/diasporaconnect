import type { InMemoryCache } from '@apollo/client';

/**
 * Event-networking data is personal and per-event. It must never sit in the
 * persisted Apollo cache (localStorage outlives the session), and it must be
 * gone when the person signs out.
 *
 * Defence in depth: networking operations already run `no-cache`, so nothing is
 * written. These helpers cover the cases where something slipped in anyway.
 */

/** Root query/mutation fields owned by networking (incl. the planned circle ones). */
export const NETWORKING_FIELD = /^(eventNetworking|networkingCircle|networkingCircles)/;

/** `Query.eventNetworking…` keys and any `EventNetworking*` typed object. */
function isNetworkingKey(key: string): boolean {
  return /^EventNetworking|^NetworkingCircle/.test(key);
}

/**
 * `persistenceMapper` for apollo3-cache-persist: receives the cache (serialised or not),
 * returns it without networking entries. Fails open on a parse error by
 * returning an empty cache (better to persist nothing than personal data).
 */
export function stripNetworkingFromPersisted<T extends string | object>(persisted: T): T {
  const wasString = typeof persisted === 'string';
  try {
    const data = (wasString ? JSON.parse(persisted as string) : persisted) as Record<string, Record<string, unknown> | unknown>;
    for (const key of Object.keys(data)) {
      if (isNetworkingKey(key)) {
        delete data[key];
        continue;
      }
      const entry = data[key];
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        for (const field of Object.keys(record)) {
          if (NETWORKING_FIELD.test(field)) delete record[field];
        }
        const tn = record.__typename;
        if (typeof tn === 'string' && isNetworkingKey(tn)) delete data[key];
      }
    }
    return (wasString ? JSON.stringify(data) : data) as T;
  } catch {
    return (wasString ? '{}' : {}) as T;
  }
}

/** Evict every networking field from the live cache (called on sign-out). */
export function purgeNetworkingCache(cache: Pick<InMemoryCache, 'extract' | 'evict' | 'gc'>): void {
  try {
    const extracted = cache.extract() as Record<string, Record<string, unknown> | undefined>;
    for (const id of Object.keys(extracted)) {
      if (isNetworkingKey(id)) {
        cache.evict({ id });
        continue;
      }
      const record = extracted[id];
      if (!record) continue;
      for (const field of Object.keys(record)) {
        if (NETWORKING_FIELD.test(field.split('(')[0])) cache.evict({ id, fieldName: field.split('(')[0] });
      }
    }
    cache.gc();
  } catch {
    /* nothing to purge */
  }
}
