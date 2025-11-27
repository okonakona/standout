// 自由に塗れる＋手順ごとの質感/色合いを実装するためのブラシテクスチャ生成
export type BrushKind = "soft" | "powder" | "cream" | "gloss";

export function makeBrushStamp(kind: BrushKind, r: number) {
    const s = r * 2;
    const cv = document.createElement("canvas");
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, s, s);

    // 共通：ソフト円形のαグラデーション
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();

    if (kind === "powder") {
        // 微粒子ノイズを上乗せ
        const n = ctx.getImageData(0, 0, s, s);
        const d = n.data;
        for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3];
            if (a > 0) {
                const jitter = (Math.random() * 80) | 0; // 0..79
                d[i] = Math.min(255, 255 - jitter);
                d[i + 1] = Math.min(255, 255 - jitter);
                d[i + 2] = Math.min(255, 255 - jitter);
            }
        }
        ctx.putImageData(n, 0, 0);
    }

    if (kind === "gloss") {
        // ハイライト筋（グロスのツヤ）を白帯で薄く
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.ellipse(r * 0.6, r * 0.6, r * 0.35, r * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // cream はデフォ（柔らかい円）。soft も同様
    return cv;
}
