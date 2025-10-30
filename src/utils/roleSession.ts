export type RoleModel = { id: string; name: string; presetId: "clean" | "kpop" | "androgynous" };
const roleListKey = "roleModels";
const activeRoleKey = "activeRoleId";

export function loadRoleModels(): RoleModel[] {
    const raw = localStorage.getItem(roleListKey);
    return raw ? (JSON.parse(raw) as RoleModel[]) : [];
}
export function saveRoleModels(list: RoleModel[]) {
    localStorage.setItem(roleListKey, JSON.stringify(list));
}
export function addRoleModel(role: RoleModel) {
    const list = loadRoleModels();
    list.push(role);
    saveRoleModels(list);
}
export function setActiveRoleId(id: string) {
    localStorage.setItem(activeRoleKey, id);
}
export function getActiveRoleId(): string | null {
    return localStorage.getItem(activeRoleKey);
}
