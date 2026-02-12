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

// セッション全体を管理する新しい型
type SimSession = {
    id: string;
    createdAt: number;
    finalImage: string;
    steps: Array<{
        note: string;
        dataUrl: string;
        createdAt: number;
    }>;
    settings?: MakeupSettings;
};

const DB = "simDB";
const STORE = "items";
const SETTINGS_STORE = "settings";
const SESSION_STORE = "sessions";

function withDb<T>(
    fn: (db: IDBDatabase, resolve: (v: T) => void, reject: (e: any) => void) => void,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 3); // バージョンを3に更新
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(SESSION_STORE)) {
                db.createObjectStore(SESSION_STORE, { keyPath: "id" });
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

export type { SimItem, MakeupSettings, SimSession };

// ★ セッション全体を保存
export async function saveSession(session: Omit<SimSession, "id" | "createdAt">) {
    const newSession: SimSession = {
        id: "session_" + crypto.randomUUID(),
        createdAt: Date.now(),
        ...session,
    };

    await withDb<void>((db, resolve, reject) => {
        const tx = db.transaction(SESSION_STORE, "readwrite");
        tx.objectStore(SESSION_STORE).put(newSession);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });

    return newSession.id;
}

// ★ すべてのセッションを取得
export async function listSessions(): Promise<SimSession[]> {
    return withDb<SimSession[]>((db, resolve, reject) => {
        const tx = db.transaction(SESSION_STORE, "readonly");
        const store = tx.objectStore(SESSION_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
            const rows = (req.result as SimSession[]).sort((a, b) => b.createdAt - a.createdAt);
            resolve(rows);
        };
        req.onerror = () => reject(req.error);
    });
}

// ★ 特定のセッションを取得
export async function getSession(sessionId: string): Promise<SimSession | null> {
    return withDb<SimSession | null>((db, resolve, reject) => {
        const tx = db.transaction(SESSION_STORE, "readonly");
        const req = tx.objectStore(SESSION_STORE).get(sessionId);
        req.onsuccess = () => {
            resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
    });
}

// ★ すべてのセッションを削除
export async function clearSessions() {
    await withDb<void>((db, resolve, reject) => {
        const tx = db.transaction(SESSION_STORE, "readwrite");
        const store = tx.objectStore(SESSION_STORE);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ★ 重複セッションを削除（同じfinalImageを持つ場合、最新のみ残す）
export async function removeDuplicateSessions() {
    const sessions = await listSessions();
    const seenImages = new Map<string, SimSession>();
    const duplicateIds: string[] = [];

    // 新しい順に処理されるので、最初に見つかったものが最新
    for (const session of sessions) {
        if (seenImages.has(session.finalImage)) {
            // 重複として削除対象にする
            duplicateIds.push(session.id);
        } else {
            seenImages.set(session.finalImage, session);
        }
    }

    // 重複を削除
    if (duplicateIds.length > 0) {
        await withDb<void>((db, resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, "readwrite");
            const store = tx.objectStore(SESSION_STORE);

            let completed = 0;
            const total = duplicateIds.length;

            for (const id of duplicateIds) {
                const req = store.delete(id);
                req.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                };
                req.onerror = () => reject(req.error);
            }
        });
    }

    return duplicateIds.length;
}

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
