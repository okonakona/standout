// src/utils/simStore.ts
type SimItem = { id: string; createdAt: number; dataUrl: string; note?: string };
const DB = "simDB";
const STORE = "items";

function withDb<T>(fn: (db: IDBDatabase) => void): Promise<T> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE))
                db.createObjectStore(STORE, { keyPath: "id" });
        };
        req.onsuccess = () => {
            fn(req.result);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function saveSim(dataUrl: string, note?: string) {
    const item: SimItem = {
        id: "sim_" + crypto.randomUUID(),
        createdAt: Date.now(),
        dataUrl,
        note,
    };
    await withDb<void>((db) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(item);
        tx.oncomplete = () => null;
    });
}

export async function listSim(): Promise<SimItem[]> {
    return await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE))
                db.createObjectStore(STORE, { keyPath: "id" });
        };
        req.onsuccess = () => {
            const db = req.result,
                tx = db.transaction(STORE, "readonly"),
                getAll = tx.objectStore(STORE).getAll();
            getAll.onsuccess = () =>
                resolve((getAll.result as SimItem[]).sort((a, b) => b.createdAt - a.createdAt));
            getAll.onerror = () => reject(getAll.error);
        };
        req.onerror = () => reject(req.error);
    });
}
