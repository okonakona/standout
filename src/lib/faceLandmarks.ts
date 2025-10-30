// src/lib/faceLandmarks.ts
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

/** 返却する各パーツの白マスク（透過背景） */
export type PartMasks = {
    width: number;
    height: number;
    lips: HTMLCanvasElement;
    brows: HTMLCanvasElement;
    eyes: HTMLCanvasElement;
    skin: HTMLCanvasElement; // 顔全体（フェイスオーバルから目・口をくり抜き）
};

let landmarker: FaceLandmarker | null = null;

export async function ensureFaceLandmarker() {
    if (landmarker) return landmarker;
    const fileset = await FilesetResolver.forVisionTasks(
        // wasm/ と models/ は public 配下に置く
        "/mediapipe"
    );
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetPath: "/mediapipe/models/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
    });
    return landmarker!;
}

/* ==== MediaPipe FaceMesh の代表インデックス群（有名どころの定義） ==== */
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

function makeCanvas(w: number, h: number) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    return cv;
}

function poly(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>) {
    if (!pts.length) return;
    const p0 = pts[0];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
}

function toPixelPoints(landmarks: { x: number; y: number }[], w: number, h: number, ids: number[]) {
    return ids.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));
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
    const lm = await ensureFaceLandmarker();
    const w = imgEl.naturalWidth || imgEl.width;
    const h = imgEl.naturalHeight || imgEl.height;

    const res = lm.detect(imgEl);
    if (!res.faceLandmarks?.length) {
        throw new Error("Face not found.");
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

    return { width: w, height: h, lips, brows, eyes, skin: face };
}
