'use client';

import { useCallback, useRef } from 'react';
import { useUserStore } from '@/store/useUserStore';
import {
  DRAFT_DB_NAME,
  DRAFT_KEY_PREFIX,
  LEGACY_DRAFT_DB_NAME,
  LEGACY_DRAFT_KEYS,
  draftFileKey,
  draftFileRange,
  draftMetaKey,
  draftOwnerKey,
} from '@/lib/postDraftKeys';

type AttachmentType = 'Photo' | 'Video' | 'Document';

export interface StoredAttachment {
  id: string;
  type: AttachmentType;
  name?: string;
  file: File;
}

export interface RestoredDraft {
  text: string;
  visibility: string;
  attachments: StoredAttachment[];
}

interface DraftMeta {
  text: string;
  visibility: string;
  hasMedia: boolean;
  savedAt: number;
}

const IDB_STORE = 'files';
const IDB_VER = 1;
/** A draft nobody came back to for 30 days is dropped (a shared machine left signed in). */
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_DB_NAME, IDB_VER);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Run one transaction and close the connection, so a sign-out can always clear the store. */
async function withStore(mode: IDBTransactionMode, run: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(IDB_STORE, mode);
    run(tx.objectStore(IDB_STORE));
    await txDone(tx);
  } finally {
    db.close();
  }
}

function readMeta(owner: string): DraftMeta | null {
  try {
    const raw = localStorage.getItem(draftMetaKey(owner));
    if (!raw) return null;
    const meta = JSON.parse(raw) as Partial<DraftMeta>;
    return {
      text: typeof meta.text === 'string' ? meta.text : '',
      visibility: typeof meta.visibility === 'string' ? meta.visibility : 'PUBLIC',
      hasMedia: meta.hasMedia === true,
      savedAt: typeof meta.savedAt === 'number' ? meta.savedAt : 0,
    };
  } catch {
    return null;
  }
}

// Drafts written before they were stored per user cannot be attributed to anyone, so
// they are dropped unread rather than shown to whoever opens the composer next.
let legacyDropped = false;
function dropLegacyDraft() {
  if (legacyDropped) return;
  legacyDropped = true;
  try {
    LEGACY_DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage blocked */
  }
  try {
    indexedDB.deleteDatabase(LEGACY_DRAFT_DB_NAME);
  } catch {
    /* IndexedDB unavailable */
  }
}

/** Whether this user has a saved draft — synchronous, for "Continue your draft" prompts. */
const isExpired = (meta: DraftMeta) => Date.now() - meta.savedAt > DRAFT_MAX_AGE_MS;

export function hasPostDraft(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const meta = readMeta(draftOwnerKey(userId));
  return !!meta && !isExpired(meta) && (meta.text.trim().length > 0 || meta.hasMedia);
}

/** Remove every post draft in this browser, whoever wrote it. Called on an explicit sign-out. */
export async function clearAllPostDrafts(): Promise<void> {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(DRAFT_KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    LEGACY_DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage blocked */
  }
  try {
    await withStore('readwrite', (store) => store.clear());
  } catch {
    /* IndexedDB unavailable */
  }
  try {
    indexedDB.deleteDatabase(LEGACY_DRAFT_DB_NAME);
  } catch {
    /* IndexedDB unavailable */
  }
}

const filesSignature = (files: ReadonlyArray<{ id: string }>) => files.map((f) => f.id).join('|');

/** The signed-in user's post draft: text + visibility in localStorage, attached files in IndexedDB. */
export function usePostDraft() {
  const userId = useUserStore((s) => s.user?.userId ?? null);
  const owner = userId ? draftOwnerKey(userId) : null;
  // Files are only rewritten when the attachment set changes, not on every text autosave.
  const savedFilesRef = useRef<string | null>(null);

  const saveDraft = useCallback(async (
    text: string,
    visibility: string,
    attachments: Array<{ id: string; type: AttachmentType; name?: string; file?: File }>
  ) => {
    if (!owner) return;
    const files = attachments.filter((a): a is StoredAttachment => !!a.file);

    try {
      if (!text.trim() && files.length === 0) {
        localStorage.removeItem(draftMetaKey(owner));
      } else {
        const meta: DraftMeta = { text, visibility, hasMedia: files.length > 0, savedAt: Date.now() };
        localStorage.setItem(draftMetaKey(owner), JSON.stringify(meta));
      }
    } catch {
      // Storage full or blocked (private mode) — posting still works, the draft just isn't kept.
    }

    const signature = filesSignature(files);
    if (signature === savedFilesRef.current) return;
    try {
      const { lower, upper } = draftFileRange(owner);
      await withStore('readwrite', (store) => {
        store.delete(IDBKeyRange.bound(lower, upper));
        files.forEach((a) => store.put({ key: draftFileKey(owner, a.id), id: a.id, type: a.type, name: a.name, file: a.file }));
      });
      savedFilesRef.current = signature;
    } catch {
      // IndexedDB unavailable — attachments won't persist but text will
    }
  }, [owner]);

  const loadDraft = useCallback(async (): Promise<RestoredDraft | null> => {
    dropLegacyDraft();
    if (!owner) return null;
    const meta = readMeta(owner);
    if (!meta) return null;
    if (isExpired(meta)) {
      try {
        localStorage.removeItem(draftMetaKey(owner));
        const { lower, upper } = draftFileRange(owner);
        await withStore('readwrite', (store) => store.delete(IDBKeyRange.bound(lower, upper)));
      } catch {
        /* storage unavailable */
      }
      savedFilesRef.current = '';
      return null;
    }

    let attachments: StoredAttachment[] = [];
    if (meta.hasMedia) {
      try {
        const { lower, upper } = draftFileRange(owner);
        let rows: Array<StoredAttachment & { key: string }> = [];
        await withStore('readonly', (store) => {
          const req = store.getAll(IDBKeyRange.bound(lower, upper));
          req.onsuccess = () => {
            rows = req.result as Array<StoredAttachment & { key: string }>;
          };
        });
        attachments = rows.map(({ id, type, name, file }) => ({ id, type, name, file }));
      } catch {
        // IndexedDB unavailable
      }
    }
    savedFilesRef.current = filesSignature(attachments);

    if (!meta.text && attachments.length === 0) return null;
    return { text: meta.text, visibility: meta.visibility, attachments };
  }, [owner]);

  const clearDraft = useCallback(async () => {
    savedFilesRef.current = '';
    if (!owner) return;
    try {
      localStorage.removeItem(draftMetaKey(owner));
    } catch {
      /* storage blocked */
    }
    try {
      const { lower, upper } = draftFileRange(owner);
      await withStore('readwrite', (store) => store.delete(IDBKeyRange.bound(lower, upper)));
    } catch {
      // IndexedDB unavailable
    }
  }, [owner]);

  return { saveDraft, loadDraft, clearDraft };
}
