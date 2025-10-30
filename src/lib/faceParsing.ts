// src/lib/faceParsing.ts
import * as ort from "onnxruntime-web";
import { createSession } from "./onnxRuntime";

export type PartMasks = {
    width: number;
    height: number;
    lips: HTMLCanvasElement;
    brows: HTMLCanvasElement;
    eyes: HTMLCanvasElement;
    skin: HTMLCanvasElement;
};

let parsingSession: ort.InferenceSession | null = null;
const MODEL_URL = "/models/face_parsing_256.onnx";

// ▼ CelebAMask-HQ 系の例（モデル仕様に合わせて必要なら変更）
const CLS = {
    skin: 1,
    lBrow: 2,
    rBrow: 3,
    lEye: 4,
    rEye: 5,
    uLip: 12,
    iLip: 13,
};

// 事前に分かっている出力名を優先（あなたのログでは "out"）
const preferredOutputName = "out";

// 入力解像度の候補（先頭から順に試す）
const trySizes = [
    { w: 512, h: 512 },
    { w: 256, h: 256 },
    { w: 320, h: 320 },
    { w: 448, h: 448 },
];

// ---- ユーティリティ ----
function makeCanvas(w: number, h: number) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    return cv;
}
function toNchwFloat32(
    rgba: Uint8ClampedArray,
    inW: number,
    inH: number,
    useNorm = false,
    mean: readonly number[] = [0.5, 0.5, 0.5],
    std: readonly number[] = [0.5, 0.5, 0.5]
) {
    const chw = new Float32Array(1 * 3 * inH * inW);
    let p = 0;
    for (let c = 0; c < 3; c++) {
        for (let y = 0; y < inH; y++) {
            for (let x = 0; x < inW; x++) {
                const idx = (y * inW + x) * 4 + c;
                let v = rgba[idx] / 255;
                if (useNorm) v = (v - mean[c]) / std[c];
                chw[p++] = v;
            }
        }
    }
    return chw;
}

export async function getFacePartMasks(image: HTMLImageElement): Promise<PartMasks> {
    if (!parsingSession) parsingSession = await createSession(MODEL_URL);

    // 入力名（最初の1個）
    const inputNames: ReadonlyArray<string> = parsingSession.inputNames;
    if (!inputNames || inputNames.length === 0) {
        throw new Error("No input names found in the ONNX session.");
    }
    const inputName = inputNames[0]; // 例: "input"

    // ---- 推論トライ関数（サイズを変えてフォールバック）----
    const runOnce = async (inW: number, inH: number) => {
        // 1) 前処理：リサイズ
        const tmp = new OffscreenCanvas(inW, inH);
        const tctx = tmp.getContext("2d")!;
        tctx.drawImage(image, 0, 0, inW, inH);
        const rgba = tctx.getImageData(0, 0, inW, inH).data;

        // 2) NHWC→NCHW float32（まずは /255 のみ）
        const chw = toNchwFloat32(rgba, inW, inH, /*useNorm=*/ false);

        // 3) テンソル作成
        const inputTensor = new ort.Tensor("float32", chw, [1, 3, inH, inW]);
        const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

        // 4) 推論
        const results = await parsingSession!.run(feeds);

        // 5) 出力名決定（"out" 優先）
        const outKey = (results as Record<string, ort.Tensor>)[preferredOutputName]
            ? preferredOutputName
            : Object.keys(results)[0];

        const output = results[outKey] as ort.Tensor; // [1, C, H, W]
        const dimsOut = output.dims as ReadonlyArray<number>;
        if (!dimsOut || dimsOut.length !== 4) {
            throw new Error("Unexpected output shape.");
        }
        const C = dimsOut[1],
            H = dimsOut[2],
            W = dimsOut[3];
        const logits = output.data as Float32Array;

        return { C, H, W, logits };
    };

    // ---- フォールバック付きで推論を試す ----
    let C = 0,
        H = 0,
        W = 0,
        logits: Float32Array | null = null;
    let lastErr: unknown = null;

    for (const sz of trySizes) {
        try {
            const r = await runOnce(sz.w, sz.h);
            C = r.C;
            H = r.H;
            W = r.W;
            logits = r.logits;
            break;
        } catch (e) {
            lastErr = e;
            // 失敗したら次のサイズへ
        }
    }
    if (!logits) {
        // すべて失敗
        throw new Error(
            "Failed to run face parsing. Tried sizes: " +
                trySizes.map((s) => `${s.w}x${s.h}`).join(", ") +
                (lastErr ? ` | last error: ${String((lastErr as Error)?.message ?? lastErr)}` : "")
        );
    }

    // ---- argmax → クラスIDマップ（H×W）----
    const clsMap = new Uint8ClampedArray(H * W);
    for (let i = 0; i < H * W; i++) {
        let best = 0;
        let bestIdx = 0;
        for (let c = 0; c < C; c++) {
            const v = logits[c * H * W + i];
            if (c === 0 || v > best) {
                best = v;
                bestIdx = c;
            }
        }
        clsMap[i] = bestIdx;
    }

    // ---- 元画像サイズに拡大（Nearest）----
    const ow = image.width;
    const oh = image.height;
    const big = makeCanvas(ow, oh);
    const bctx = big.getContext("2d")!;
    const small = new ImageData(new Uint8ClampedArray(H * W * 4), W, H);
    for (let i = 0; i < H * W; i++) {
        const id = clsMap[i];
        const k = i * 4;
        small.data[k] = id;
        small.data[k + 1] = id;
        small.data[k + 2] = id;
        small.data[k + 3] = 255;
    }
    const bmp = await createImageBitmap(small);
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(bmp, 0, 0, W, H, 0, 0, ow, oh);

    // ---- パーツごとの白マスク作成（白=対象 / 透明=非対象）----
    const src = bctx.getImageData(0, 0, ow, oh);
    function extractMask(ids: number[]): HTMLCanvasElement {
        const cv = makeCanvas(ow, oh);
        const ctx = cv.getContext("2d")!;
        const out = ctx.createImageData(ow, oh);
        const d = src.data;
        const o = out.data;
        for (let i = 0; i < ow * oh; i++) {
            const id = d[i * 4]; // R にID
            const a = ids.includes(id) ? 255 : 0;
            const k = i * 4;
            o[k] = 255;
            o[k + 1] = 255;
            o[k + 2] = 255;
            o[k + 3] = a;
        }
        ctx.putImageData(out, 0, 0);
        return cv;
    }

    const lips = extractMask([CLS.uLip, CLS.iLip]);
    const brows = extractMask([CLS.lBrow, CLS.rBrow]);
    const eyes = extractMask([CLS.lEye, CLS.rEye]);
    const skin = extractMask([CLS.skin]);

    return { width: ow, height: oh, lips, brows, eyes, skin };
}
