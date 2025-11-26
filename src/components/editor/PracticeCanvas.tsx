// src/components/editor/PracticeCanvas.tsx
// "use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { makeBrushStamp } from "@/lib/brushTex";
import { STEP_CONFIG, Step } from "@/types/steps";
import "@/styles/editor/practiceCanvas.css";

type Props = {
    image: HTMLImageElement;
    activeStep: Step; // 今編集しているステップ
    order: Step[]; // 合成順
    colorByStep: Record<Step, string>; // ステップごとの色
    strengthByStep: Record<Step, number>; // ステップごとの強さ(0..1) ＝ 1コート分
    brushRadius: number;
    mode: "paint" | "erase";
    faceClipMask: HTMLCanvasElement | null; // 顔クリップ（フェイス輪郭＋首）
    eyeHoleMask?: HTMLCanvasElement | null; // 目の穴（ここは塗れない）
    lipAllowMask?: HTMLCanvasElement | null; // 唇のみ可（リップ時）
    guidePathD?: string;
    guideBandPx?: number;
    partMask?: HTMLCanvasElement | null; // 今は使わない（将来用）
    /** 合成済み 2D 画像を親に渡す（WebGL のベース用） */
    onCompositeChange?: (canvas: HTMLCanvasElement) => void;
    /** ステップごとの「塗ったマスク」を親に渡す（WebGL の maskTex 用） */
    onStepMaskChange?: (step: Step, mask: HTMLCanvasElement) => void;
};

export default function PracticeCanvas(props: Props) {
    const {
        image,
        activeStep,
        order,
        colorByStep,
        strengthByStep,
        brushRadius,
        mode,
        faceClipMask,
        eyeHoleMask = null,
        lipAllowMask = null,
        guidePathD,
        guideBandPx,
        onCompositeChange,
        onStepMaskChange,
    } = props;

    const displayRef = useRef<HTMLCanvasElement | null>(null);
    const baseCvRef = useRef<HTMLCanvasElement | null>(null);
    const paintMasksRef = useRef<Record<Step, HTMLCanvasElement>>({} as any);

    const [isDown, setIsDown] = useState(false);
    const lastPt = useRef<{ x: number; y: number } | null>(null);

    const cfg = STEP_CONFIG[activeStep];

    const stamp = useMemo(
        () => makeBrushStamp(cfg.brush, Math.max(1, brushRadius)),
        [cfg.brush, brushRadius]
    );

    // 初期化
    useEffect(() => {
        const w = image.width;
        const h = image.height;

        if (displayRef.current) {
            displayRef.current.width = w;
            displayRef.current.height = h;
            displayRef.current.style.width = "100%";
            displayRef.current.style.height = "auto";
        }

        if (!baseCvRef.current) baseCvRef.current = document.createElement("canvas");
        baseCvRef.current.width = w;
        baseCvRef.current.height = h;
        const bctx = baseCvRef.current.getContext("2d")!;
        bctx.clearRect(0, 0, w, h);
        bctx.drawImage(image, 0, 0, w, h);

        const next: Record<Step, HTMLCanvasElement> = { ...paintMasksRef.current };
        order.forEach((s) => {
            if (!next[s]) next[s] = document.createElement("canvas");
            next[s].width = w;
            next[s].height = h;
            // 既存の描画内容は維持
        });
        paintMasksRef.current = next;

        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image, order]);

    // 色・強さ・マスクが変わったら再描画
    useEffect(() => {
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorByStep, strengthByStep, faceClipMask, eyeHoleMask, activeStep]);

    // ===== 2D 合成（既存と同じ考え方） =====
    function redraw() {
        const out = displayRef.current;
        const baseCv = baseCvRef.current;
        if (!out || !baseCv) return;

        const octx = out.getContext("2d")!;
        const w = out.width;
        const h = out.height;

        octx.clearRect(0, 0, w, h);
        octx.globalCompositeOperation = "source-over";
        octx.globalAlpha = 1;
        octx.drawImage(baseCv, 0, 0);

        // 各ステップを順番に重ねていく
        order.forEach((step) => {
            const mask = paintMasksRef.current[step];
            if (!mask) return;

            const strength = strengthByStep[step];
            if (strength <= 0) return;

            const color = colorByStep[step];
            const cfg = STEP_CONFIG[step];

            // 単色塗り
            const tint = document.createElement("canvas");
            tint.width = w;
            tint.height = h;
            const tctx = tint.getContext("2d")!;
            tctx.fillStyle = color;
            tctx.fillRect(0, 0, w, h);

            const painted = document.createElement("canvas");
            painted.width = w;
            painted.height = h;
            const pd = painted.getContext("2d")!;

            pd.globalCompositeOperation = "source-over";
            pd.drawImage(tint, 0, 0); // 色
            pd.globalCompositeOperation = "destination-in";
            pd.drawImage(mask, 0, 0); // 手で塗ったところだけ

            // 顔外クリップ
            if (faceClipMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(faceClipMask, 0, 0);
            }
            // 目の中は常に抜く
            if (eyeHoleMask) {
                pd.globalCompositeOperation = "destination-out";
                pd.drawImage(eyeHoleMask, 0, 0);
            }
            // リップ時のみ唇内に制限
            if (step === "lips" && lipAllowMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(lipAllowMask, 0, 0);
            }

            // ベースにブレンド
            octx.globalCompositeOperation = cfg.blend as GlobalCompositeOperation;
            octx.globalAlpha = strength;
            octx.drawImage(painted, 0, 0);
            octx.globalAlpha = 1;
            octx.globalCompositeOperation = "source-over";
        });

        // 親に「最新合成結果」を通知（WebGL ベース用）
        if (onCompositeChange) {
            onCompositeChange(out);
        }
    }

    // ===== 手描き（activeStep のマスクだけ更新） =====
    function paintDot(x: number, y: number) {
        const mask = paintMasksRef.current[activeStep];
        if (!mask) return;

        const w = mask.width;
        const h = mask.height;

        const dab = document.createElement("canvas");
        dab.width = w;
        dab.height = h;
        const dctx = dab.getContext("2d")!;
        dctx.globalCompositeOperation = "source-over";
        dctx.drawImage(stamp, x - brushRadius, y - brushRadius);

        if (faceClipMask) {
            dctx.globalCompositeOperation = "destination-in";
            dctx.drawImage(faceClipMask, 0, 0);
        }
        if (eyeHoleMask) {
            dctx.globalCompositeOperation = "destination-out";
            dctx.drawImage(eyeHoleMask, 0, 0);
        }
        if (activeStep === "lips" && lipAllowMask) {
            dctx.globalCompositeOperation = "destination-in";
            dctx.drawImage(lipAllowMask, 0, 0);
        }

        const ctx = mask.getContext("2d")!;
        ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        ctx.drawImage(dab, 0, 0);

        // ステップマスク変更を親に通知
        if (onStepMaskChange) {
            onStepMaskChange(activeStep, mask);
        }

        redraw();
    }

    function paintLine(x0: number, y0: number, x1: number, y1: number) {
        const steps = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 4));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x0 + (x1 - x0) * t;
            const y = y0 + (y1 - y0) * t;
            paintDot(x, y);
        }
    }

    function toLocal(e: React.PointerEvent<HTMLCanvasElement>) {
        const cv = displayRef.current!;
        const rect = cv.getBoundingClientRect();
        const x = ((e.clientX - rect.left) * cv.width) / rect.width;
        const y = ((e.clientY - rect.top) * cv.height) / rect.height;
        return { x, y };
    }

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        e.preventDefault();
        const { x, y } = toLocal(e);
        setIsDown(true);
        lastPt.current = { x, y };
        paintDot(x, y);
    }
    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDown) return;
        e.preventDefault();
        const { x, y } = toLocal(e);
        const last = lastPt.current;
        if (!last) {
            lastPt.current = { x, y };
            return;
        }
        paintLine(last.x, last.y, x, y);
        lastPt.current = { x, y };
    }
    function onPointerUp() {
        setIsDown(false);
        lastPt.current = null;
    }

    function clearCurrentStep() {
        const mask = paintMasksRef.current[activeStep];
        if (!mask) return;
        const ctx = mask.getContext("2d")!;
        ctx.clearRect(0, 0, mask.width, mask.height);

        if (onStepMaskChange) {
            onStepMaskChange(activeStep, mask);
        }
        redraw();
    }

    return (
        <div className="canvasWrap">
            <canvas
                ref={displayRef}
                className="practiceCanvas-2d"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            />

            {guidePathD && (
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${image.width} ${image.height}`}
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                    {guideBandPx && guideBandPx > 0 && (
                        <path
                            d={guidePathD}
                            fill="none"
                            stroke="#00bcd4"
                            strokeOpacity="0.2"
                            strokeWidth={guideBandPx * 2}
                        />
                    )}
                    <path
                        d={guidePathD}
                        fill="none"
                        stroke="#00bcd4"
                        strokeOpacity="0.9"
                        strokeWidth={2}
                    />
                </svg>
            )}

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={clearCurrentStep}>このステップの塗りをクリア</button>
            </div>
        </div>
    );
}
