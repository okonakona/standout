import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadEditorImage } from "@/utils/imageSession";
import { useMasks } from "@/hooks/useMasks";
import { saveSim, saveMakeupSettings } from "@/utils/simStore";
import { STEP_CONFIG, Step } from "@/types/steps";

const ORDER: Step[] = [
    "primer",
    "foundation",
    "concealer",
    "powder",
    "contour",
    "highlight",
    "brows",
    "shadow",
    "lips",
];

// ==========================
// 顔のバウンディングボックス
// ==========================
type FaceRect = { x: number; y: number; w: number; h: number };

/** faceClipMask(白=顔, 透明=顔外) から顔の矩形を推定 */
function computeFaceRect(
    faceClipMask: HTMLCanvasElement | null,
    img: HTMLImageElement | null
): FaceRect | null {
    if (!faceClipMask || !img) return null;

    const w = faceClipMask.width;
    const h = faceClipMask.height;
    const ctx = faceClipMask.getContext("2d");
    if (!ctx) return null;

    const data = ctx.getImageData(0, 0, w, h).data;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    const step = 2;
    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            const a = data[idx + 3];
            if (a > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < 0 || maxY < 0) return null;

    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const marginX = rawW * 0.08;
    const marginY = rawH * 0.08;

    const x = Math.max(0, minX - marginX);
    const y = Math.max(0, minY - marginY);
    const ww = Math.min(w - x, rawW + marginX * 2);
    const hh = Math.min(h - y, rawH + marginY * 2);

    return { x, y, w: ww, h: hh };
}

// ==========================
// ガイド生成
// ==========================
function getGuideForStep(
    step: Step,
    img: HTMLImageElement | null,
    faceRect: FaceRect | null
): {
    d: string;
    bandPx: number;
} {
    if (!img || !faceRect) return { d: "", bandPx: 0 };

    const { x: fx, y: fy, w: fw, h: fh } = faceRect;

    const cx = fx + fw / 2;
    const cyEyes = fy + fh * 0.3;
    const cyNose = fy + fh * 0.48;
    const cyMouth = fy + fh * 0.68;
    const cyChin = fy + fh * 0.9;

    const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
        `M ${cx - rx},${cy} ` +
        `a ${rx},${ry} 0 1,0 ${2 * rx},0 ` +
        `a ${rx},${ry} 0 1,0 ${-2 * rx},0`;

    const noseTriangle = () => {
        const topY = fy + fh * 0.32;
        const leftX = cx - fw * 0.06;
        const rightX = cx + fw * 0.06;
        const bottomY = fy + fh * 0.55;
        return `M ${cx},${topY} L ${rightX},${bottomY} L ${leftX},${bottomY} Z`;
    };

    // 顔全体：下地 / ファンデ / パウダー
    if (step === "primer" || step === "foundation" || step === "powder") {
        const faceOval = ellipse(cx, fy + fh * 0.52, fw * 0.55, fh * 0.6);
        return { d: faceOval, bandPx: 6 };
    }

    // コンシーラー
    if (step === "concealer") {
        const underEyeL = ellipse(cx - fw * 0.22, cyEyes + fh * 0.06, fw * 0.15, fh * 0.07);
        const underEyeR = ellipse(cx + fw * 0.22, cyEyes + fh * 0.06, fw * 0.15, fh * 0.07);
        const noseDot = ellipse(cx, cyNose, fw * 0.05, fh * 0.05);
        const beard = ellipse(cx, fy + fh * 0.78, fw * 0.45, fh * 0.18);
        const chin = ellipse(cx, cyChin, fw * 0.28, fh * 0.1);
        return { d: [underEyeL, underEyeR, noseDot, beard, chin].join(" "), bandPx: 4 };
    }

    // ハイライト
    if (step === "highlight") {
        const foreheadCenter = ellipse(cx, fy + fh * 0.3, fw * 0.26, fh * 0.12);
        const nose = noseTriangle();
        const cheekL = ellipse(cx - fw * 0.23, fy + fh * 0.5, fw * 0.18, fh * 0.09);
        const cheekR = ellipse(cx + fw * 0.23, fy + fh * 0.5, fw * 0.18, fh * 0.09);
        return { d: [foreheadCenter, nose, cheekL, cheekR].join(" "), bandPx: 5 };
    }

    // シェーディング
    if (step === "contour") {
        const templeL = ellipse(cx - fw * 0.3, fy + fh * 0.32, fw * 0.18, fh * 0.12);
        const templeR = ellipse(cx + fw * 0.3, fy + fh * 0.32, fw * 0.18, fh * 0.12);
        const jawL = ellipse(cx - fw * 0.27, fy + fh * 0.72, fw * 0.17, fh * 0.12);
        const jawR = ellipse(cx + fw * 0.27, fy + fh * 0.72, fw * 0.17, fh * 0.12);
        const chin = ellipse(cx, cyChin + fh * 0.03, fw * 0.3, fh * 0.11);
        return { d: [templeL, templeR, jawL, jawR, chin].join(" "), bandPx: 6 };
    }

    // アイブロウ
    if (step === "brows") {
        const browL = ellipse(cx - fw * 0.2, cyEyes - fh * 0.08, fw * 0.14, fh * 0.05);
        const browR = ellipse(cx + fw * 0.2, cyEyes - fh * 0.08, fw * 0.14, fh * 0.05);
        return { d: [browL, browR].join(" "), bandPx: 3 };
    }

    // アイシャドウ
    if (step === "shadow") {
        const upperL = ellipse(cx - fw * 0.2, cyEyes, fw * 0.14, fh * 0.07);
        const upperR = ellipse(cx + fw * 0.2, cyEyes, fw * 0.14, fh * 0.07);
        return { d: [upperL, upperR].join(" "), bandPx: 4 };
    }

    // リップ
    if (step === "lips") {
        const lips = ellipse(cx, cyMouth, fw * 0.22, fh * 0.08);
        return { d: lips, bandPx: 5 };
    }

    return { d: "", bandPx: 0 };
}

export function useEditorPage() {
    const router = useRouter();
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [step, setStep] = useState<Step>("primer");

    const [brushRadius, setBrushRadius] = useState<number>(STEP_CONFIG.primer.defaultRadius);
    const [mode, setMode] = useState<"paint" | "erase" | "blur">("paint");

    const [colorByStep, setColorByStep] = useState<Record<Step, string>>(() => {
        const init: Record<Step, string> = {} as any;
        ORDER.forEach((s) => (init[s] = STEP_CONFIG[s].defaultColor));
        return init;
    });
    const [strengthByStep] = useState<Record<Step, number>>(() => {
        const init: Record<Step, number> = {} as any;
        ORDER.forEach((s) => (init[s] = STEP_CONFIG[s].defaultStrength));
        return init;
    });

    // 2D 合成結果
    const [compositeCanvas, setCompositeCanvas] = useState<HTMLCanvasElement | null>(null);
    // ステップごとのマスク
    const [maskByStep, setMaskByStep] = useState<Partial<Record<Step, HTMLCanvasElement>>>({});

    // 画像ロード
    useEffect(() => {
        const src = loadEditorImage();
        if (!src) {
            router.replace("/upload");
            return;
        }
        const im = new Image();
        im.onload = () => setImg(im);
        im.src = src;
    }, [router]);

    const { masks, loading, error } = useMasks(img);

    // 顔矩形 → ガイド
    const faceRect = useMemo(() => computeFaceRect(masks?.faceClipMask ?? null, img), [masks, img]);
    const guide = useMemo(() => getGuideForStep(step, img, faceRect), [step, img, faceRect]);

    // ===== キャンバス取得 =====
    const getCurrentCanvas = useCallback(() => {
        return (
            document.querySelector<HTMLCanvasElement>("canvas.practiceCanvas-2d") ||
            document.querySelector<HTMLCanvasElement>("canvas.practiceCanvas-webgl")
        );
    }, []);

    // ===== ステップごとのスナップショット保存 =====
    const saveStepSnapshot = useCallback(
        (targetStep: Step) => {
            const cv = getCurrentCanvas();
            if (!cv) {
                console.warn("スナップショット用キャンバスが見つかりません");
                return;
            }
            try {
                const url = cv.toDataURL("image/jpeg", 0.92);
                // ★ ここを label ではなく ID（step）で保存する
                void saveSim(url, targetStep);
            } catch (e) {
                console.error("saveSim(step) でエラー:", e);
            }
        },
        [getCurrentCanvas]
    );

    // ===== 最終結果を保存して /result へ =====
    const saveAndGoResult = useCallback(() => {
        const cv = getCurrentCanvas();

        if (!cv) {
            alert("メイク結果のキャンバスが見つかりません。");
            router.push("/result");
            return;
        }

        try {
            const url = cv.toDataURL("image/jpeg", 0.92);
            // ここは "FINAL" のままで OK
            void saveSim(url, "FINAL");
            // メイク設定も保存
            void saveMakeupSettings({
                colorByStep,
                strengthByStep,
            });
        } catch (e) {
            console.error("saveSim(FINAL) でエラーが発生しましたが、結果画面には遷移します:", e);
        } finally {
            router.push("/result");
        }
    }, [getCurrentCanvas, router, colorByStep, strengthByStep]);

    // ===== ステップ移動 =====
    const goNextStep = useCallback(() => {
        const i = ORDER.indexOf(step);

        // 今のステップをスナップショット保存（非同期・エラーは無視）
        saveStepSnapshot(step);

        if (i < ORDER.length - 1) {
            const next = ORDER[i + 1];
            setStep(next);
            setBrushRadius(STEP_CONFIG[next].defaultRadius);
        }
    }, [saveStepSnapshot, step]);

    const goPrevStep = useCallback(() => {
        const i = ORDER.indexOf(step);
        if (i > 0) {
            const prev = ORDER[i - 1];
            setStep(prev);
            setBrushRadius(STEP_CONFIG[prev].defaultRadius);
        }
    }, [step]);

    // ===== 最後の「メイク完了」 =====
    const handleFinish = useCallback(() => {
        // 最終ステップの状態も 1 枚保存してから、FINAL 保存＋遷移
        saveStepSnapshot(step);
        saveAndGoResult();
    }, [saveStepSnapshot, saveAndGoResult, step]);

    const cfg = STEP_CONFIG[step];
    const currentColor = colorByStep[step];
    const currentStrength = strengthByStep[step];
    const activeMask = maskByStep[step] || compositeCanvas;

    const isFirst = ORDER.indexOf(step) === 0;
    const isLast = step === "lips";

    return {
        img,
        loading,
        error,
        order: ORDER,
        step,
        cfg,
        brushRadius,
        mode,
        colorByStep,
        strengthByStep,
        guide,
        masks,
        compositeCanvas,
        activeMask,
        maskByStep,
        isFirst,
        isLast,
        currentColor,
        currentStrength,
        setMode,
        setBrushRadius,
        setColorByStep,
        setCompositeCanvas,
        setMaskByStep,
        goPrevStep,
        goNextStep,
        handleFinish,
    };
}
