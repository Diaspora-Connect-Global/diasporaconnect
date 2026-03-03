/**
 * URL classification and extraction for chat link previews.
 * Used to detect file links (image, video, document) vs post vs generic website.
 */

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif',
]);
const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv',
]);
const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm',
]);
const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'csv', 'xls', 'xlsx', 'doc', 'docx', 'txt', 'ppt', 'pptx',
  'odt', 'ods', 'odp', 'rtf', 'pages', 'numbers', 'key',
]);

export type UrlClassification = 'post' | 'image' | 'video' | 'audio' | 'document' | 'youtube' | 'website';

/** Extract YouTube video ID from youtube.com/watch?v=ID or youtu.be/ID. */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' && (parsed.pathname === '/watch' || parsed.pathname.startsWith('/watch/'))) {
      return parsed.searchParams.get('v');
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id || null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract post ID from a post URL path (e.g. /en/post/abc-123 or https://domain.com/en/post/abc-123). */
export function extractPostIdFromUrl(url: string): string | null {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const match = path.match(/\/(?:post|posts)\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getExtension(url: string): string | null {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const lastSegment = path.split('/').filter(Boolean).pop();
    if (!lastSegment || !lastSegment.includes('.')) return null;
    const ext = lastSegment.split('.').pop()?.toLowerCase();
    return ext ?? null;
  } catch {
    return null;
  }
}

/**
 * Classify a URL for preview rendering: post, image, video, audio, document, or website.
 * Uses path extension only (no HEAD request). Post URLs take precedence.
 */
export function classifyUrl(url: string): UrlClassification {
  const trimmed = url?.trim();
  if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
    return 'website';
  }
  try {
    new URL(trimmed);
  } catch {
    return 'website';
  }
  if (extractPostIdFromUrl(trimmed)) return 'post';
  if (extractYouTubeVideoId(trimmed)) return 'youtube';
  const ext = getExtension(trimmed);
  if (!ext) return 'website';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'document';
  return 'website';
}

/**
 * Returns the first valid HTTP/HTTPS URL found in the text, or null.
 */
export function getFirstUrlInText(text: string | undefined): string | null {
  if (!text?.trim()) return null;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const match = text.match(urlRegex);
  if (!match?.[0]) return null;
  try {
    new URL(match[0]);
    return match[0];
  } catch {
    return null;
  }
}

/**
 * Derive a display filename from a URL path (for document/file cards).
 */
export function getFileNameFromUrl(url: string): string {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const lastSegment = path.split('/').filter(Boolean).pop();
    return lastSegment && lastSegment.length > 0 ? decodeURIComponent(lastSegment) : 'file';
  } catch {
    return 'file';
  }
}
