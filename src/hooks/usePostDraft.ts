'use client';

import { useCallback } from 'react';

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

const LS_TEXT_KEY = 'cpd_text';
const LS_VIS_KEY = 'cpd_visibility';
const IDB_DB = 'diaspora-cpd';
const IDB_STORE = 'files';
const IDB_VER = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, IDB_VER);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function usePostDraft() {
  const saveDraft = useCallback(async (
    text: string,
    visibility: string,
    attachments: Array<{ id: string; type: AttachmentType; name?: string; file?: File }>
  ) => {
    localStorage.setItem(LS_TEXT_KEY, text);
    localStorage.setItem(LS_VIS_KEY, visibility);

    try {
      const db = await openDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      attachments.forEach(a => {
        if (a.file) store.put({ id: a.id, type: a.type, name: a.name, file: a.file });
      });
    } catch {
      // IndexedDB unavailable — attachments won't persist but text will
    }
  }, []);

  const loadDraft = useCallback(async (): Promise<RestoredDraft | null> => {
    const text = localStorage.getItem(LS_TEXT_KEY) ?? '';
    const visibility = localStorage.getItem(LS_VIS_KEY) ?? 'PUBLIC';

    let attachments: StoredAttachment[] = [];
    try {
      const db = await openDB();
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      attachments = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result as StoredAttachment[]);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // IndexedDB unavailable
    }

    if (!text && attachments.length === 0) return null;
    return { text, visibility, attachments };
  }, []);

  const clearDraft = useCallback(async () => {
    localStorage.removeItem(LS_TEXT_KEY);
    localStorage.removeItem(LS_VIS_KEY);
    try {
      const db = await openDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}
