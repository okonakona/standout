// src/utils/simStore.ts
import { Step } from "@/types/steps";

type SimItem = { 
    id: string; 
    createdAt: number; 
    dataUrl: string; 
    note?: string;
    colorByStep?: Record<Step, string>;
    strengthByStep?: Record<Step, number>;
};

type MakeupSettings = {
    colorByStep: Record<Step, string>;
    strengthByStep: Record<Step, number>;
};

const DB = "simDB";
const STORE = "items";
const SETTINGS_STORE = "settings";

function withDb<T>(
    fn: (db: IDBDatabase, resolve: (v: T) => void, reject: (e: any) => void) => void
): Promise<T> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 2);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
            }
        };
        req.onsuccess = () => {
            fn(req.result, resolve, reject);
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
    await withDb<void>((db, resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function listSim(): Promise<SimItem[]> {
    return withDb<SimItem[]>((db, resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        req.onsuccess = () => {
            const rows = (req.result as SimItem[]).sort((a, b) => b.createdAt - a.createdAt);
            resolve(rows);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function saveMakeupSettings(settings: MakeupSettings) {
    const item = {
        id: "latest",
        ...settings,
        createdAt: Date.now(),
    };
    await withDb<void>((db, resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, "readwrite");
        tx.objectStore(SETTINGS_STORE).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadMakeupSettings(): Promise<MakeupSettings | null> {
    return withDb<MakeupSettings | null>((db, resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, "readonly");
        const req = tx.objectStore(SETTINGS_STORE).get("latest");
        req.onsuccess = () => {
            resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
    });
}

export type { SimItem, MakeupSettings };

// ★ すべての保存済みメイク結果を削除（履歴画面用）
export async function clearSimStore() {
    await withDb<void>((db, resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
