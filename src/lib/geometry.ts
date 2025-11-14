// src/lib/geometry.ts
export function maskToSvgPath(maskCanvas: HTMLCanvasElement | null): string {
    // nullチェック
    if (!maskCanvas) {
        return "";
    }

    const w = maskCanvas.width,
        h = maskCanvas.height;

    // サイズチェック
    if (!w || !h) {
        return "";
    }

    const ctx = maskCanvas.getContext("2d");
    if (!ctx) {
        return "";
    }

    const data = ctx.getImageData(0, 0, w, h).data;

    let minX = w,
        minY = h,
        maxX = 0,
        maxY = 0,
        found = false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a > 0) {
                found = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (!found) return "";
    const cx = (minX + maxX) / 2,
        cy = (minY + maxY) / 2,
        rx = (maxX - minX) / 2,
        ry = (maxY - minY) / 2;
    return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
}
