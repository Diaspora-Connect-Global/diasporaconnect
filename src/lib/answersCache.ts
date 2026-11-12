/**
 * Registration answers (`formResponsesJson`) are what attendees typed into an organiser's
 * form: names, emails, phone numbers. The Apollo cache is persisted to localStorage, which
 * outlives the session, so these fields are removed from what is written there (the live
 * in-memory cache is untouched; a reload simply fetches them again).
 */
export function stripAnswersFromPersisted<T extends string | object>(persisted: T): T {
  const wasString = typeof persisted === 'string';
  try {
    const data = (wasString ? JSON.parse(persisted as string) : persisted) as Record<string, unknown>;
    for (const entry of Object.values(data)) {
      if (entry && typeof entry === 'object' && 'formResponsesJson' in (entry as Record<string, unknown>)) {
        delete (entry as Record<string, unknown>).formResponsesJson;
      }
    }
    return (wasString ? JSON.stringify(data) : data) as T;
  } catch {
    return (wasString ? '{}' : {}) as T;
  }
}
