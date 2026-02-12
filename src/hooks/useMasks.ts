// src/hooks/useMasks.ts
import { useEffect, useState } from "react";
import { createSession } from "@/lib/onnxRuntime";
import * as ort from "onnxruntime-web";

export type FaceBox = {
    x: number; // 左上X
    y: number; // 左上Y
    w: number; // 幅
    h: number; // 高さ
};

// 顔の代表パーツ位置
export type FaceRegions = {
    face: FaceBox | null; // 顔全体（skin + 目鼻口 などの union）
    browL: FaceBox | null;
    browR: FaceBox | null;
    eyeL: FaceBox | null;
    eyeR: FaceBox | null;
    nose: FaceBox | null;
    mouth: FaceBox | null; // 口〜唇
};

// 返すマスク
export type MasksOut = {
    faceClipMask: HTMLCanvasElement | null; // 顔外NG（白=顔、透明=外）
    lipAllowMask: HTMLCanvasElement | null; // リップ時のみOK（白=唇、透明=それ以外）
    regions: FaceRegions | null; // ★ 各パーツの位置
    isFallbackMode: boolean; // 顔認識失敗時のフォールバックモード
};

const MODEL_URL = "/models/face_parsing_256.onnx";

// CelebAMask-HQ 系の代表ID（モデルにより差があります）
const CLS = {
    background: 0,
    skin: 1,
    lBrow: 2,
    rBrow: 3,
    lEye: 4,
    rEye: 5,
    eyeG: 6, // eye glass / eye globe 等の扱いはモデル依存
    lEar: 7,
    rEar: 8,
    earR: 9,
    nose: 10,
    mouth: 11,
    uLip: 12,
    iLip: 13,

    // ↓ ここを追加（CelebAMask-HQ を想定した首まわり）
    neck: 14,
    neck2: 15,
    cloth: 16,
    // 17 hair, 18 hat … はこのアプリでは顔外として扱う
} as const;

// ユーティリティ
function makeCanvas(w: number, h: number) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    return cv;
}
function featherBinary(src: HTMLCanvasElement, blurPx: number) {
    if (blurPx <= 0) return src;
    const w = src.width,
        h = src.height;
    const tmp = makeCanvas(w, h);
    const tctx = tmp.getContext("2d")!;
    tctx.filter = `blur(${blurPx}px)`;
    tctx.drawImage(src, 0, 0);
    tctx.filter = "none";
    const id = tctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        const v = a > 1 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = v;
    }
    tctx.putImageData(id, 0, 0);
    return tmp;
}

// ONNX 推論：画像→クラスIDマップ（元画像サイズ）
// タイムアウト付きで推論を実行
async function runParsing(image: HTMLImageElement): Promise<Uint8ClampedArray> {
    console.log("[faceParsing] Starting face parsing...");

    // セッション作成（共通ヘルパーでログ抑制とプロバイダフォールバックを行う）
    let session: ort.InferenceSession;
    try {
        session = await createSession(MODEL_URL);
    } catch (e) {
        console.error("[faceParsing] Failed to create session:", e);
        throw new Error("Face parsing model failed to load");
    }

    // 入力名（モデル側の input 名）
    const inputName = session.inputNames[0] ?? "input";

    // === ★ このモデルは 512×512 前提で動かす（OrtRun のエラーに合わせる） ===
    const inN = 1;
    const inC = 3;
    const inH = 512;
    const inW = 512;

    // 前処理：リサイズ→RGB→NCHW float32(0..1)
    const tmp = makeCanvas(inW, inH);
    const tctx = tmp.getContext("2d")!;
    tctx.drawImage(image, 0, 0, inW, inH);
    const rgba = tctx.getImageData(0, 0, inW, inH).data;

    const chw = new Float32Array(inN * inC * inH * inW);
    let p = 0;
    for (let c = 0; c < 3; c++) {
        for (let y = 0; y < inH; y++) {
            for (let x = 0; x < inW; x++) {
                const idx = (y * inW + x) * 4 + c;
                chw[p++] = rgba[idx] / 255;
            }
        }
    }

    // [1,3,512,512] で Tensor を作成
    const input = new ort.Tensor("float32", chw, [inN, inC, inH, inW]);

    // 推論（タイムアウト付き）
    console.log("[faceParsing] Running inference with input shape:", input.dims);
    let outMap: any;
    try {
        // 30秒のタイムアウトを設定
        const inferencePromise = session.run({ [inputName]: input });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Inference timeout")), 30000),
        );
        outMap = await Promise.race([inferencePromise, timeoutPromise]);
        console.log("[faceParsing] Inference completed successfully");
    } catch (e) {
        console.error("[faceParsing] Inference failed:", e);
        throw new Error(`Face parsing inference failed: ${(e as Error).message}`);
    }

    // 出力キーはモデルにより異なるので、最初の要素を使う
    const outKey = Object.keys(outMap)[0];
    const out = outMap[outKey] as ort.Tensor;

    // 出力形状：NCHW(C=クラス数) か NHWC のどちらかに対応
    const dims = out.dims;
    const data = out.data as Float32Array;

    let C = 0,
        H = 0,
        W = 0,
        isNCHW = true;

    if (dims.length === 4) {
        // まず NCHW としてチェック
        if (dims[1] > 4 && dims[2] === inH && dims[3] === inW) {
            // [1,C,H,W]
            C = dims[1];
            H = dims[2];
            W = dims[3];
            isNCHW = true;
        } else if (dims[3] > 4 && dims[1] === inH && dims[2] === inW) {
            // [1,H,W,C]
            C = dims[3];
            H = dims[1];
            W = dims[2];
            isNCHW = false;
        } else {
            // 最後の手段：入力と同じ H,W として扱う
            H = inH;
            W = inW;
            // C は dims の中で一番大きいものを採用
            const arr = [...dims];
            C = Math.max(arr[1] ?? 0, arr[3] ?? 0);
            isNCHW = (arr[1] ?? 0) === C;
        }
    } else {
        throw new Error(`Unexpected output dims: ${dims.join("x")}`);
    }

    // argmax → クラスID（H*W）
    const cls = new Uint8ClampedArray(H * W);

    if (isNCHW) {
        // data: [1,C,H,W]
        for (let i = 0; i < H * W; i++) {
            let best = -Infinity;
            let bestIdx = 0;
            for (let c = 0; c < C; c++) {
                const v = data[c * H * W + i];
                if (v > best) {
                    best = v;
                    bestIdx = c;
                }
            }
            cls[i] = bestIdx;
        }
    } else {
        // data: [1,H,W,C] (NHWC)
        for (let i = 0; i < H * W; i++) {
            let best = -Infinity;
            let bestIdx = 0;
            const offset = i * C;
            for (let c = 0; c < C; c++) {
                const v = data[offset + c];
                if (v > best) {
                    best = v;
                    bestIdx = c;
                }
            }
            cls[i] = bestIdx;
        }
    }

    // 元画像サイズへ最近傍拡大
    const ow = image.naturalWidth || image.width;
    const oh = image.naturalHeight || image.height;

    const srcCv = makeCanvas(W, H);
    const sctx = srcCv.getContext("2d")!;
    const id = sctx.createImageData(W, H);
    for (let i = 0; i < H * W; i++) {
        const k = i * 4;
        const v = cls[i];
        id.data[k] = v;
        id.data[k + 1] = v;
        id.data[k + 2] = v;
        id.data[k + 3] = 255;
    }
    sctx.putImageData(id, 0, 0);

    const dstCv = makeCanvas(ow, oh);
    const dctx = dstCv.getContext("2d")!;
    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(srcCv, 0, 0, W, H, 0, 0, ow, oh);

    // 返り値は「Rチャンネル=クラスID」の RGBA を読み直して R 抜き出し
    const big = dctx.getImageData(0, 0, ow, oh).data;
    const outCls = new Uint8ClampedArray(ow * oh);
    for (let i = 0; i < ow * oh; i++) {
        outCls[i] = big[i * 4];
    }

    return outCls;
}

// クラスID配列から白マスクを作る
function maskFromClasses(
    cls: Uint8ClampedArray,
    w: number,
    h: number,
    allowIds: number[],
): HTMLCanvasElement {
    const cv = makeCanvas(w, h);
    const ctx = cv.getContext("2d")!;
    const out = ctx.createImageData(w, h);
    const o = out.data;
    for (let i = 0; i < w * h; i++) {
        const a = allowIds.includes(cls[i]) ? 255 : 0;
        const k = i * 4;
        o[k] = 255;
        o[k + 1] = 255;
        o[k + 2] = 255;
        o[k + 3] = a;
    }
    ctx.putImageData(out, 0, 0);
    return cv;
}

// クラスID配列から「指定ID群が出ている最小の矩形」を求める
function boxFromClasses(
    cls: Uint8ClampedArray,
    w: number,
    h: number,
    allowIds: number[],
): FaceBox | null {
    let minX = w,
        minY = h;
    let maxX = -1,
        maxY = -1;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (!allowIds.includes(cls[i])) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }

    if (maxX < 0 || maxY < 0) return null;

    return {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
    };
}

// 複数の矩形を union する
function unionBoxes(boxes: (FaceBox | null)[]): FaceBox | null {
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    for (const b of boxes) {
        if (!b) continue;
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.w > maxX) maxX = b.x + b.w;
        if (b.y + b.h > maxY) maxY = b.y + b.h;
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        return null;
    }

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
    };
}

export function useMasks(img: HTMLImageElement | null) {
    const [masks, setMasks] = useState<MasksOut | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!img) {
            setMasks(null);
            setLoading(false);
            setErr(null);
            return;
        }

        (async () => {
            setLoading(true);
            setErr(null);

            try {
                if (!img.complete || (img.naturalWidth ?? 0) === 0) {
                    await new Promise<void>((resolve, reject) => {
                        const tid = setTimeout(
                            () => reject(new Error("Image loading timeout")),
                            10000,
                        );
                        img.onload = () => {
                            clearTimeout(tid);
                            resolve();
                        };
                        img.onerror = () => {
                            clearTimeout(tid);
                            reject(new Error("Image loading failed"));
                        };
                    });
                }

                // 1) セグメンテーション（エラーハンドリング強化）
                console.log(
                    "[useMasks] Starting face parsing for image:",
                    img.src.substring(0, 50),
                );
                let clsMap: Uint8ClampedArray;
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;

                if (!w || !h || w === 0 || h === 0) {
                    throw new Error(`Invalid image dimensions: ${w}x${h}`);
                }

                try {
                    clsMap = await runParsing(img);
                    console.log("[useMasks] ✅ Face parsing successful");
                } catch (parseError) {
                    console.error("[useMasks] ⚠️ Face parsing failed, using fallback:", parseError);
                    // フォールバック: 全ピクセルを肌(1)として扱う
                    clsMap = new Uint8ClampedArray(w * h);
                    for (let i = 0; i < clsMap.length; i++) {
                        clsMap[i] = CLS.skin; // 全体を肌として扱う
                    }
                }

                // 2) マスク生成 ------------------------------

                // 顔クリップ：肌/眉/目/鼻/口/唇/首まわり
                const faceIds = [
                    CLS.skin,
                    CLS.lBrow,
                    CLS.rBrow,
                    CLS.lEye,
                    CLS.rEye,
                    CLS.eyeG,
                    CLS.nose,
                    CLS.mouth,
                    CLS.uLip,
                    CLS.iLip,
                    CLS.neck,
                    CLS.neck2,
                ];
                const faceClipMaskRaw = maskFromClasses(clsMap, w, h, faceIds);
                const faceClipMask = featherBinary(faceClipMaskRaw, 1.2);

                // 唇のみOK（リップ時に destination-in）
                const lipAllowMaskRaw = maskFromClasses(clsMap, w, h, [
                    CLS.uLip,
                    CLS.iLip,
                    CLS.mouth,
                ]);
                const lipAllowMask = featherBinary(lipAllowMaskRaw, 0.8);

                // ★ 3) パーツ位置（矩形） --------------------

                const browLBox = boxFromClasses(clsMap, w, h, [CLS.lBrow]);
                const browRBox = boxFromClasses(clsMap, w, h, [CLS.rBrow]);
                const eyeLBox = boxFromClasses(clsMap, w, h, [CLS.lEye]);
                const eyeRBox = boxFromClasses(clsMap, w, h, [CLS.rEye]);
                const noseBox = boxFromClasses(clsMap, w, h, [CLS.nose]);
                const mouthBox = boxFromClasses(clsMap, w, h, [CLS.mouth, CLS.uLip, CLS.iLip]);

                // 顔全体 = 上で使った faceIds の union
                const faceBox = boxFromClasses(clsMap, w, h, faceIds);

                const regions: FaceRegions = {
                    face: faceBox,
                    browL: browLBox,
                    browR: browRBox,
                    eyeL: eyeLBox,
                    eyeR: eyeRBox,
                    nose: noseBox,
                    mouth: mouthBox,
                };

                // 4) state へ反映
                if (!cancelled) {
                    setMasks({
                        faceClipMask,
                        lipAllowMask,
                        regions,
                        isFallbackMode: false,
                    });
                }
            } catch (e: any) {
                console.warn("[useMasks] Face parsing failed; fallback free-paint:", e);
                if (!cancelled) {
                    setErr("顔解析に失敗しましたが、基本機能は利用できます。");
                    // フォールバック：全体許可（顔=白全面）, 目制限なし, リップ専用なし
                    try {
                        const w = img.naturalWidth || img.width || 640;
                        const h = img.naturalHeight || img.height || 480;
                        const faceCanvas = makeCanvas(w, h);
                        const ctx = faceCanvas.getContext("2d")!;
                        ctx.fillStyle = "#fff";
                        ctx.fillRect(0, 0, w, h);
                        const eyeCanvas = makeCanvas(w, h);
                        setMasks({
                            faceClipMask: faceCanvas,
                            lipAllowMask: null,
                            regions: null,
                            isFallbackMode: true,
                        });
                    } catch {
                        setMasks({
                            faceClipMask: null,
                            lipAllowMask: null,
                            regions: null,
                            isFallbackMode: true,
                        });
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [img]);

    return { masks, loading, error };
}
