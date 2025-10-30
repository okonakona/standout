export type Part = "lips" | "brows" | "eyes" | "skin";

export type PartMasks = {
    lips?: HTMLCanvasElement;
    brows?: HTMLCanvasElement;
    eyes?: HTMLCanvasElement;
    skin?: HTMLCanvasElement;
};

/**
 * MVP用：ユーザーが最初に軽く「お手本」をトレースしたレイヤから
 * 2値化してパーツマスクを作る（将来ONNX出力に差し替え）。
 */
export function binarizeToMask(srcCanvas: HTMLCanvasElement, thresh = 8): HTMLCanvasElement {
    const w = srcCanvas.width,
        h = srcCanvas.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const sctx = srcCanvas.getContext("2d")!;
    const octx = out.getContext("2d")!;
    const img = sctx.getImageData(0, 0, w, h);
    const dst = octx.createImageData(w, h);
    const d = img.data,
        o = dst.data;
    for (let i = 0; i < d.length; i += 4) {
        // アルファ閾値で2値化
        const a = d[i + 3];
        const v = a > thresh ? 255 : 0;
        o[i] = 255;
        o[i + 1] = 255;
        o[i + 2] = 255;
        o[i + 3] = v;
    }
    octx.putImageData(dst, 0, 0);
    return out;
}
