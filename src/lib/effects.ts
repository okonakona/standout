export type Step = "base" | "lips" | "brows" | "eyes";

function clamp(v: number) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** 下地：わずかに明るさ/コントラスト */
export function applyBase(data: ImageData) {
    const out = new ImageData(data.width, data.height);
    const d = data.data,
        o = out.data;
    const alpha = 1.08; // 明るさ
    const beta = 1.06; // コントラスト
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i],
            g = d[i + 1],
            b = d[i + 2];
        r = clamp((r - 128) * beta + 128);
        g = clamp((g - 128) * beta + 128);
        b = clamp((b - 128) * beta + 128);
        r = clamp(r * alpha);
        g = clamp(g * alpha);
        b = clamp(b * alpha);
        o[i] = r;
        o[i + 1] = g;
        o[i + 2] = b;
        o[i + 3] = d[i + 3];
    }
    return out;
}

/** リップ：全体の彩度を少し上げる（暫定・セグ分割前のデモ） */
export function applyLips(data: ImageData) {
    const out = new ImageData(data.width, data.height);
    const d = data.data,
        o = out.data;
    const sat = 1.15; // 彩度
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i] / 255,
            g = d[i + 1] / 255,
            b = d[i + 2] / 255;
        const max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        let h = 0,
            s = 0,
            l = (max + min) / 2;
        if (max !== min) {
            const diff = max - min;
            s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / diff + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / diff + 2;
                    break;
                case b:
                    h = (r - g) / diff + 4;
                    break;
            }
            h /= 6;
        }
        // 彩度アップ
        s = Math.min(1, s * sat);
        // HSL -> RGB
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
        o[i] = Math.round(r * 255);
        o[i + 1] = Math.round(g * 255);
        o[i + 2] = Math.round(b * 255);
        o[i + 3] = d[i + 3];
    }
    return out;
}

/** 眉：わずかにコントラスト＆ガンマ（全体に軽く） */
export function applyBrows(data: ImageData) {
    const out = new ImageData(data.width, data.height);
    const d = data.data,
        o = out.data;
    const contrast = 1.08,
        gamma = 0.95;
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i] / 255,
            g = d[i + 1] / 255,
            b = d[i + 2] / 255;
        r = Math.pow(r, gamma);
        g = Math.pow(g, gamma);
        b = Math.pow(b, gamma);
        r = (r * 255 - 128) * contrast + 128;
        g = (g * 255 - 128) * contrast + 128;
        b = (b * 255 - 128) * contrast + 128;
        o[i] = clamp(r);
        o[i + 1] = clamp(g);
        o[i + 2] = clamp(b);
        o[i + 3] = d[i + 3];
    }
    return out;
}

/** 目元：ほんのりビネット（周辺を少し暗く） */
export function applyEyes(data: ImageData) {
    const out = new ImageData(data.width, data.height);
    const d = data.data,
        o = out.data;
    const w = data.width,
        h = data.height;
    const cx = w / 2,
        cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const dx = x - cx,
                dy = y - cy;
            const r = Math.sqrt(dx * dx + dy * dy) / maxR;
            const dark = 1 - 0.12 * Math.pow(r, 1.2); // 中央1.0→外周0.88
            o[idx] = clamp(d[idx] * dark);
            o[idx + 1] = clamp(d[idx + 1] * dark);
            o[idx + 2] = clamp(d[idx + 2] * dark);
            o[idx + 3] = d[idx + 3];
        }
    }
    return out;
}
