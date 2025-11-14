// src/lib/faceLandmarks.ts
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// TensorFlow Liteのログを抑制
const originalWarn = console.warn;
const originalLog = console.log;
const originalInfo = console.info;

function filterTensorFlowLogs() {
    console.warn = (...args: any[]) => {
        const message = args.join(" ");
        if (
            message.includes("tf.lite") ||
            message.includes("TensorFlow") ||
            message.includes("TFJS") ||
            message.includes("tfjs")
        ) {
            return; // TensorFlow関連のログを除外
        }
        originalWarn.apply(console, args);
    };

    console.log = (...args: any[]) => {
        const message = args.join(" ");
        if (
            message.includes("tf.lite") ||
            message.includes("TensorFlow") ||
            message.includes("TFJS") ||
            message.includes("tfjs")
        ) {
            return; // TensorFlow関連のログを除外
        }
        originalLog.apply(console, args);
    };

    console.info = (...args: any[]) => {
        const message = args.join(" ");
        if (
            message.includes("tf.lite") ||
            message.includes("TensorFlow") ||
            message.includes("TFJS") ||
            message.includes("tfjs")
        ) {
            return; // TensorFlow関連のログを除外
        }
        originalInfo.apply(console, args);
    };
}

// 解析して、顔からはみ出さないように常時マスク設定
// 返り値に faceClipMask を追加しておくと便利
export type PartMasks = {
    width: number;
    height: number;
    lips: HTMLCanvasElement;
    brows: HTMLCanvasElement;
    eyes: HTMLCanvasElement;
    skin: HTMLCanvasElement;
    faceClipMask: HTMLCanvasElement; // ← 追加：フェイスオーバル - 目口 を軽フェザー
};

let landmarker: FaceLandmarker | null = null;

export async function ensureFaceLandmarker() {
    if (landmarker) return landmarker;

    try {
        // TensorFlow Liteのログを抑制開始
        filterTensorFlowLogs();

        console.log("[FaceLandmarks] 🔄 Initializing face detection (CDN)...");
        const fileset = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
        );

        landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            },
            runningMode: "IMAGE",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
        });

        console.log("[FaceLandmarks] ✅ Face detection ready! Precise facial controls enabled.");
        return landmarker!;
    } catch (error) {
        console.warn("[FaceLandmarks] ⚠️ CDN initialization failed, trying local files...");

        // フォールバック：ローカルファイルを試す
        try {
            const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
            landmarker = await FaceLandmarker.createFromOptions(fileset, {
                baseOptions: {
                    modelAssetPath: "/mediapipe/models/face_landmarker.task",
                },
                runningMode: "IMAGE",
                numFaces: 1,
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: false,
            });
            console.log("[FaceLandmarks] ✅ Local fallback successful! Face detection enabled.");
            return landmarker!;
        } catch (fallbackError) {
            console.info(
                "[FaceLandmarks] 🎨 Face detection unavailable - Running in Free Paint Mode"
            );
            console.info("[FaceLandmarks] ℹ️ You can paint freely anywhere on the image!");

            // エラーを投げずに null を返す（顔認識なしモード）
            return null;
        }
    }
} /* ==== MediaPipe FaceMesh の代表インデックス群（有名どころの定義） ==== */
// 口：外輪／内輪
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 310, 415, 308];
// 眉（左／右）
const BROW_LEFT = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const BROW_RIGHT = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];
// 目（左／右）
const EYE_LEFT = [33, 7, 163, 144, 145, 153, 154, 155, 133];
const EYE_RIGHT = [362, 382, 381, 380, 374, 373, 390, 249, 263];
// 顔の外周（フェイスオーバルの代表セット）
const FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
    148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

type XY = { x: number; y: number };

function makeCanvas(w: number, h: number) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    return cv;
}

function toPixelPoints(landmarks: { x: number; y: number }[], w: number, h: number, ids: number[]) {
    return ids.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));
}

// 単一ポリゴン塗り
function fillPolygon(cv: HTMLCanvasElement, pts: XY[], color = "#fff") {
    const ctx = cv.getContext("2d")!;
    if (!pts.length) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
}

// 複数ポリゴンを even-odd で塗る（穴あき用）
function fillPolygonsEvenOdd(cv: HTMLCanvasElement, polys: XY[][], color = "#fff") {
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const pts of polys) {
        if (!pts.length) continue;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
    }
    ctx.fill("evenodd");
}

// ぼかし→2値化で「膨張/収縮」に相当（マージン調整用）
function featherBinary(src: HTMLCanvasElement, blurPx: number): HTMLCanvasElement {
    if (blurPx <= 0) return src;
    const w = src.width,
        h = src.height;
    const tmp = makeCanvas(w, h);
    const tctx = tmp.getContext("2d")!;
    tctx.filter = `blur(${blurPx}px)`;
    tctx.drawImage(src, 0, 0);
    tctx.filter = "none";
    // 2値化（α>1 を白100%）
    const id = tctx.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) {
        const a = id.data[i + 3];
        const v = a > 1 ? 255 : 0;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 255;
        id.data[i + 3] = v;
    }
    tctx.putImageData(id, 0, 0);
    return tmp;
}

/**
 * 画像1枚から、顔クリップ（顔外は不可）と、目の穴（目中は不可）を作る。
 * - faceClipMask: 白=顔内 / 透明=外側
 * - eyeHoleMask : 白=目の中（抜く領域）/ 透明=それ以外
 * marginPx / eyeMarginPx で少し安全マージンを付けられます。
 */
export async function buildClipMasksFromLandmarks(
    imgEl: HTMLImageElement,
    marginPx = 1.5,
    eyeMarginPx = 0.8
): Promise<{ faceClipMask: HTMLCanvasElement; eyeHoleMask: HTMLCanvasElement }> {
    try {
        const lm = await ensureFaceLandmarker();
        const w = imgEl.naturalWidth || imgEl.width;
        const h = imgEl.naturalHeight || imgEl.height;

        // MediaPipeが初期化できなかった場合（顔認識なしモード）
        if (!lm) {
            console.info("[FaceLandmarks] 🎨 Creating Free Paint Mode masks");
            const emptyFaceClip = makeCanvas(w, h);
            const emptyEyeHole = makeCanvas(w, h);

            // 顔全体を白で塗る（フォールバック）
            const ctx = emptyFaceClip.getContext("2d")!;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);

            return { faceClipMask: emptyFaceClip, eyeHoleMask: emptyEyeHole };
        }

        // 画像が完全にロードされているかチェック
        if (!imgEl.complete || imgEl.naturalWidth === 0) {
            throw new Error("Image not fully loaded");
        }

        console.log("[FaceLandmarks] 🔍 Detecting face landmarks...");
        const res = lm.detect(imgEl);
        if (!res || !res.faceLandmarks?.length) {
            throw new Error("No face detected in the image");
        }
        const points = res.faceLandmarks[0];

        // ポリゴン抽出
        const faceOvalPts = toPixelPoints(points, w, h, FACE_OVAL);
        const eyeLPts = toPixelPoints(points, w, h, EYE_LEFT);
        const eyeRPts = toPixelPoints(points, w, h, EYE_RIGHT);

        // 顔クリップ（白=顔内）：フェイスオーバルを塗って軽く膨張（外へ marginPx）
        const face = makeCanvas(w, h);
        fillPolygon(face, faceOvalPts, "#fff");
        const faceClipMask = featherBinary(face, marginPx);

        // 目ホール（白=禁止領域）：左右の目を union。軽く膨張（内側にも外側にも効く）
        const eyes = makeCanvas(w, h);
        fillPolygon(eyes, eyeLPts, "#fff");
        fillPolygon(eyes, eyeRPts, "#fff");
        const eyeHoleMask = featherBinary(eyes, eyeMarginPx);

        console.log("[FaceLandmarks] ✅ Face mask created successfully");
        return { faceClipMask, eyeHoleMask };
    } catch (error) {
        console.error("[FaceLandmarks] Error building clip masks:", error);

        // フォールバック：空のマスクを返す
        const w = imgEl.naturalWidth || imgEl.width || 640;
        const h = imgEl.naturalHeight || imgEl.height || 480;
        const emptyFaceClip = makeCanvas(w, h);
        const emptyEyeHole = makeCanvas(w, h);

        // 顔全体を白で塗る（フォールバック）
        const ctx = emptyFaceClip.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);

        console.warn("[FaceLandmarks] Using fallback masks due to face detection failure");
        return { faceClipMask: emptyFaceClip, eyeHoleMask: emptyEyeHole };
    }
}

function poly(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>) {
    if (!pts.length) return;
    const p0 = pts[0];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
}

/** 多角形の白マスク（fillRule を evenodd にすると内側くり抜きができる） */
function maskFromPolygons(
    w: number,
    h: number,
    polygons: Array<Array<{ x: number; y: number }>>,
    evenOdd = false
) {
    const cv = makeCanvas(w, h);
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff";
    if (evenOdd) {
        // 1枚のパスに複数ポリゴンを順番に追加
        ctx.beginPath();
        polygons.forEach((pts) => {
            if (!pts.length) return;
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath();
        });
        ctx.fill("evenodd");
    } else {
        polygons.forEach((pts) => {
            poly(ctx, pts);
            ctx.fill();
        });
    }
    return cv;
}

/** A − B でくり抜き（destination-out） */
function subtractMask(base: HTMLCanvasElement, hole: HTMLCanvasElement) {
    const cv = makeCanvas(base.width, base.height);
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(hole, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    return cv;
}

/** 軽いフェザー */
function feather(mask: HTMLCanvasElement, px = 1) {
    if (px <= 0) return mask;
    const w = mask.width,
        h = mask.height;
    const cv = makeCanvas(w, h),
        ctx = cv.getContext("2d")!;
    ctx.filter = `blur(${px}px)`;
    ctx.drawImage(mask, 0, 0);
    ctx.filter = "none";
    return cv;
}

/** メイン：画像から唇/眉/目/顔の安定マスクを生成 */
export async function getFacePartMasksByLandmarks(imgEl: HTMLImageElement): Promise<PartMasks> {
    try {
        console.log("[FaceLandmarks] Getting face part masks...");
        const lm = await ensureFaceLandmarker();
        const w = imgEl.naturalWidth || imgEl.width;
        const h = imgEl.naturalHeight || imgEl.height;

        // MediaPipeが初期化できなかった場合（顔認識なしモード）
        if (!lm) {
            console.log("[FaceLandmarks] MediaPipe not available, using fallback masks");
            const emptyCanvas = () => makeCanvas(w, h);
            const fullCanvas = () => {
                const cv = makeCanvas(w, h);
                const ctx = cv.getContext("2d")!;
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, w, h);
                return cv;
            };

            return {
                width: w,
                height: h,
                lips: emptyCanvas(),
                brows: emptyCanvas(),
                eyes: emptyCanvas(),
                skin: fullCanvas(), // 顔全体を白で塗る
                faceClipMask: fullCanvas(),
            };
        }

        // 画像が完全にロードされているかチェック
        if (!imgEl.complete || imgEl.naturalWidth === 0) {
            throw new Error("Image not fully loaded");
        }

        const res = lm.detect(imgEl);
        if (!res.faceLandmarks?.length) {
            throw new Error("Face not found in the image");
        }
        const points = res.faceLandmarks[0]; // 1顔前提

        // 各パーツのポリゴン
        const lipsOuterPts = toPixelPoints(points, w, h, LIPS_OUTER);
        const lipsInnerPts = toPixelPoints(points, w, h, LIPS_INNER);
        const browLPts = toPixelPoints(points, w, h, BROW_LEFT);
        const browRPts = toPixelPoints(points, w, h, BROW_RIGHT);
        const eyeLPts = toPixelPoints(points, w, h, EYE_LEFT);
        const eyeRPts = toPixelPoints(points, w, h, EYE_RIGHT);
        const faceOvalPts = toPixelPoints(points, w, h, FACE_OVAL);

        // マスク生成
        // 唇：外輪 − 内輪（偶奇塗りでドーナツ）
        let lips = maskFromPolygons(w, h, [lipsOuterPts, lipsInnerPts], true);
        lips = feather(lips, 1.2);

        // 眉
        let brows = maskFromPolygons(w, h, [browLPts, browRPts]);
        brows = feather(brows, 0.8);

        // 目
        let eyes = maskFromPolygons(w, h, [eyeLPts, eyeRPts]);
        eyes = feather(eyes, 0.8);

        // 顔（フェイスオーバル − 目 − 口）
        let face = maskFromPolygons(w, h, [faceOvalPts]);
        face = subtractMask(face, eyes);
        face = subtractMask(face, lips);
        face = feather(face, 0.8);

        console.log("[FaceLandmarks] Face part masks generated successfully");
        return {
            width: w,
            height: h,
            lips,
            brows,
            eyes,
            skin: face,
            faceClipMask: face, // 同じでもOK。必要ならフェザー値を少し強めても◎
        };
    } catch (error) {
        console.error("[FaceLandmarks] Error getting face part masks:", error);

        // フォールバック：基本的なマスクを生成
        const w = imgEl.naturalWidth || imgEl.width || 640;
        const h = imgEl.naturalHeight || imgEl.height || 480;

        const emptyCanvas = () => makeCanvas(w, h);
        const fullCanvas = () => {
            const cv = makeCanvas(w, h);
            const ctx = cv.getContext("2d")!;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);
            return cv;
        };

        console.warn("[FaceLandmarks] Using fallback masks due to face processing failure");
        return {
            width: w,
            height: h,
            lips: emptyCanvas(),
            brows: emptyCanvas(),
            eyes: emptyCanvas(),
            skin: fullCanvas(), // 顔全体を白で塗る
            faceClipMask: fullCanvas(),
        };
    }
}
