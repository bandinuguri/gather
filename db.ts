import { Report } from './types';

const DB_NAME = 'AirportSafetyDB';
const STORE_NAME_V2 = 'reports_v2'; // New store for individual records
const STORE_NAME_LEGACY = 'reportsStore'; // Old store for migration
const KEY_LEGACY = 'admin_reports';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bump version to 2
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create V2 store with 'id' as primary key
      if (!db.objectStoreNames.contains(STORE_NAME_V2)) {
        db.createObjectStore(STORE_NAME_V2, { keyPath: 'id' });
      }

      // Keep Legacy store for migration if needed (or create it if starting fresh/weird state)
      if (!db.objectStoreNames.contains(STORE_NAME_LEGACY)) {
        db.createObjectStore(STORE_NAME_LEGACY);
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
};

// --- Helpers ---
// Remove photos from memory to keep the app fast
const stripPhotos = (report: Report): Report => {
  return {
    ...report,
    items: report.items.map(item => ({
      ...item,
      photos: [], // Empty photos for list view
      photo: undefined
    }))
  };
};

export const saveReportToDB = async (report: Report) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME_V2, 'readwrite');
    const store = tx.objectStore(STORE_NAME_V2);
    const req = store.put(report);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const deleteReportFromDB = async (id: number) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME_V2, 'readwrite');
    const store = tx.objectStore(STORE_NAME_V2);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const loadReportFull = async (id: number): Promise<Report | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME_V2, 'readonly');
    const store = tx.objectStore(STORE_NAME_V2);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Load ALL reports but STRIP photos to save memory (Lightweight)
export const loadReportsMetadata = async (): Promise<Report[]> => {
  const db = await initDB();
  
  // 1. Check Migration
  await migrateLegacyData(db);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME_V2, 'readonly');
    const store = tx.objectStore(STORE_NAME_V2);
    const req = store.openCursor();
    const results: Report[] = [];

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result;
      if (cursor) {
        const fullReport = cursor.value as Report;
        // Optimization: Push stripped version to array
        results.push(stripPhotos(fullReport));
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
};

export const clearAllDB = async () => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_NAME_V2, STORE_NAME_LEGACY], 'readwrite');
    tx.objectStore(STORE_NAME_V2).clear();
    tx.objectStore(STORE_NAME_LEGACY).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Migration Logic: Move single-blob array to individual records
const migrateLegacyData = async (db: IDBDatabase) => {
  return new Promise<void>((resolve) => {
    const tx = db.transaction([STORE_NAME_LEGACY, STORE_NAME_V2], 'readwrite');
    const legacyStore = tx.objectStore(STORE_NAME_LEGACY);
    const v2Store = tx.objectStore(STORE_NAME_V2);

    const req = legacyStore.get(KEY_LEGACY);
    req.onsuccess = () => {
      const oldData = req.result as Report[];
      if (Array.isArray(oldData) && oldData.length > 0) {
        console.log(`Migrating ${oldData.length} records to V2 store...`);
        let count = 0;
        oldData.forEach(r => {
           // Ensure ID
           const rWithId = { ...r, id: r.id || (Date.now() + Math.random() + count++) };
           v2Store.put(rWithId);
        });
        // Clear old data after migration
        legacyStore.delete(KEY_LEGACY);
      }
      resolve();
    };
    req.onerror = () => resolve(); // Ignore error, just proceed
  });
};
