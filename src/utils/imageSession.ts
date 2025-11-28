export const editorImageKey = "editorImage" as const;

// クライアントサイドでのみ sessionStorage にアクセス
function isClient() {
    return typeof window !== "undefined";
}

export function saveEditorImage(dataUrl: string) {
    if (!isClient()) return;
    sessionStorage.setItem(editorImageKey, dataUrl);
}

export function loadEditorImage(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(editorImageKey);
}

export function clearEditorImage() {
    if (!isClient()) return;
    sessionStorage.removeItem(editorImageKey);
}
