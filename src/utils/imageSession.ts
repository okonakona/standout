export const editorImageKey = "editorImage" as const;

export function saveEditorImage(dataUrl: string) {
    sessionStorage.setItem(editorImageKey, dataUrl);
}

export function loadEditorImage(): string | null {
    return sessionStorage.getItem(editorImageKey);
}

export function clearEditorImage() {
    sessionStorage.removeItem(editorImageKey);
}
