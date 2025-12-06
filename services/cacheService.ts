import { Artwork } from "../types";

const DB_NAME = 'UffiziGuideDB';
const AUDIO_STORE = 'audio_files';
const DATA_STORE = 'artwork_data';

// Simple IndexedDB wrapper
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const cacheAudio = async (key: string, base64Audio: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).put(base64Audio, key);
  } catch (e) {
    console.warn("Failed to cache audio", e);
  }
};

export const getCachedAudio = async (key: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const req = tx.objectStore(AUDIO_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const cacheArtworkDetails = async (key: string, data: any): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DATA_STORE, 'readwrite');
    tx.objectStore(DATA_STORE).put(data, key);
  } catch (e) {
    console.warn("Failed to cache details", e);
  }
};

export const getCachedArtworkDetails = async (key: string): Promise<any | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DATA_STORE, 'readonly');
      const req = tx.objectStore(DATA_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};