// src/utils/color.ts
// 色まわりの小ユーティリティ

// #rrggbb → 0..1 の sRGB
export function hexToSRGB01(hex: string): [number, number, number] {
    const h = hex.replace("#", "").trim();
    if (h.length !== 6) return [1, 1, 1];
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b];
}

// 0..1 の sRGB → #rrggbb
export function sRGB01ToHex(r: number, g: number, b: number): string {
    const to255 = (v: number) =>
        Math.max(0, Math.min(255, Math.round(v * 255)))
            .toString(16)
            .padStart(2, "0");

    return `#${to255(r)}${to255(g)}${to255(b)}`;
}

// Display-P3 用の CSS カラー文字列を作る
// 例: color(display-p3 0.95 0.8 0.7)
export function makeDisplayP3Css(r: number, g: number, b: number): string {
    return `color(display-p3 ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)})`;
}

// ブラウザが color(display-p3 ...) をサポートしているかチェック
export function supportsDisplayP3(): boolean {
    if (typeof window === "undefined" || typeof CSS === "undefined" || !CSS.supports) {
        return false;
    }
    return CSS.supports("color", "color(display-p3 1 1 1)");
}

// UI は hex、内部は Display-P3 を優先して使いたいとき用
export function getFillStyleP3OrHex(hex: string): string {
    const [r, g, b] = hexToSRGB01(hex);
    if (supportsDisplayP3()) {
        // ここでは「sRGB の値を P3 色空間の座標としてそのまま使う」簡易版。
        // （厳密な色空間変換ではないけど、広色域ディスプレイで滑らかになりやすい）
        return makeDisplayP3Css(r, g, b);
    }
    return hex;
}
