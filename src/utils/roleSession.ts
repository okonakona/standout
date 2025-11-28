export type RoleModel = { id: string; name: string; presetId: "clean" | "kpop" | "androgynous" };
const roleListKey = "roleModels";
const activeRoleKey = "activeRoleId";

// クライアントサイドでのみ localStorage にアクセス
function isClient() {
    return typeof window !== "undefined";
}

export function loadRoleModels(): RoleModel[] {
    if (!isClient()) return [];
    const raw = localStorage.getItem(roleListKey);
    return raw ? (JSON.parse(raw) as RoleModel[]) : [];
}

export function saveRoleModels(list: RoleModel[]) {
    if (!isClient()) return;
    localStorage.setItem(roleListKey, JSON.stringify(list));
}

export function addRoleModel(role: RoleModel) {
    const list = loadRoleModels();
    list.push(role);
    saveRoleModels(list);
}

export function setActiveRoleId(id: string) {
    if (!isClient()) return;
    localStorage.setItem(activeRoleKey, id);
}

export function getActiveRoleId(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(activeRoleKey);
}
