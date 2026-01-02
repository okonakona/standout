// src/components/editor/PracticeCanvas.tsx
import React, { useEffect, useRef, useState } from "react";
import { STEP_CONFIG, Step } from "@/types/steps";
import { getFillStyleP3OrHex } from "@/utils/color";
import "@/styles/editor/practiceCanvas.css";

type Props = {
    image: HTMLImageElement;
    activeStep: Step; // 今編集しているステップ
    order: Step[]; // 合成順
    colorByStep: Record<Step, string>; // ステップごとの色
    strengthByStep: Record<Step, number>; // ステップごとの強さ(0..1) ＝ 1コート分
    brushRadius: number;
    mode: "paint" | "erase" | "blur";
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

function makeCanvas(w: number, h: number) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    return cv;
}

export default function PracticeCanvas({
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
}: Props) {
    const displayRef = useRef<HTMLCanvasElement | null>(null); // 画面に見えているキャンバス
    const baseRef = useRef<HTMLCanvasElement | null>(null); // 元画像キャンバス
    const paintMasksRef = useRef<Record<Step, HTMLCanvasElement>>({} as any); // ステップごとのマスク
    const dabRef = useRef<HTMLCanvasElement | null>(null); // 一時キャンバス（毎ストローク再利用）

    const [isDown, setIsDown] = useState(false);
    const lastPt = useRef<{ x: number; y: number } | null>(null);

    // 画像のロードに合わせてキャンバス準備
    useEffect(() => {
        const w = image.width;
        const h = image.height;

        // 表示キャンバス
        if (displayRef.current) {
            displayRef.current.width = w;
            displayRef.current.height = h;
            displayRef.current.style.width = "100%";
            displayRef.current.style.height = "auto";
        }

        // 元画像キャンバス
        if (!baseRef.current) baseRef.current = makeCanvas(w, h);
        baseRef.current.width = w;
        baseRef.current.height = h;
        const bctx = baseRef.current.getContext("2d")!;
        bctx.clearRect(0, 0, w, h);
        bctx.drawImage(image, 0, 0, w, h);

        // ステップ別マスク（サイズを画像に合わせる）
        const nextMasks: Record<Step, HTMLCanvasElement> = { ...paintMasksRef.current };
        order.forEach((s) => {
            if (!nextMasks[s]) {
                nextMasks[s] = makeCanvas(w, h);
            } else {
                if (nextMasks[s].width !== w || nextMasks[s].height !== h) {
                    const tmp = makeCanvas(w, h);
                    const tctx = tmp.getContext("2d")!;
                    tctx.drawImage(nextMasks[s], 0, 0, w, h);
                    nextMasks[s] = tmp;
                }
            }
        });
        paintMasksRef.current = nextMasks;

        // 一時キャンバス
        if (!dabRef.current) dabRef.current = makeCanvas(w, h);
        dabRef.current.width = w;
        dabRef.current.height = h;

        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image, order]);

    // 色・強さ・マスクが変わったら再合成
    useEffect(() => {
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorByStep, strengthByStep, faceClipMask, eyeHoleMask, lipAllowMask, activeStep]);

    // ===== 全ステップを 2D で合成 =====
    function redraw() {
        const out = displayRef.current;
        const baseCv = baseRef.current;
        if (!out || !baseCv) return;

        const octx = out.getContext("2d")!;
        const w = out.width;
        const h = out.height;

        // 0) クリア
        octx.clearRect(0, 0, w, h);

        // 1) 元画像
        octx.globalCompositeOperation = "source-over";
        octx.globalAlpha = 1;
        octx.drawImage(baseCv, 0, 0);

        // 2) ステップ順にレイヤーを重ねる
        for (const step of order) {
            const mask = paintMasksRef.current[step];
            if (!mask) continue;

            const stepCfg = STEP_CONFIG[step];
            const color = colorByStep[step];
            const strength = strengthByStep[step];
            if (strength <= 0) continue;

            // ベタ塗りレイヤ
            const tint = makeCanvas(w, h);
            const tctx = tint.getContext("2d")!;
            tctx.fillStyle = getFillStyleP3OrHex(color);
            tctx.fillRect(0, 0, w, h);

            // マスク適用
            const painted = makeCanvas(w, h);
            const pd = painted.getContext("2d")!;

            pd.globalCompositeOperation = "source-over";
            pd.drawImage(tint, 0, 0);

            // ユーザーが塗った部分だけ残す
            pd.globalCompositeOperation = "destination-in";
            pd.drawImage(mask, 0, 0);

            // 顔外カット
            if (faceClipMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(faceClipMask, 0, 0);
            }
            // 目の中カット
            if (eyeHoleMask) {
                pd.globalCompositeOperation = "destination-out";
                pd.drawImage(eyeHoleMask, 0, 0);
            }
            // リップ時だけ唇に制限
            if (step === "lips" && lipAllowMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(lipAllowMask, 0, 0);
            }

            // 最終合成
            octx.globalCompositeOperation = stepCfg.blend as GlobalCompositeOperation;
            octx.globalAlpha = strength;
            octx.drawImage(painted, 0, 0);
        }

        octx.globalCompositeOperation = "source-over";
        octx.globalAlpha = 1;

        // 親に通知
        if (onCompositeChange) {
            onCompositeChange(out);
        }
    }

    // ===== 手描き（今のステップのマスクにだけ描画） =====
    function paintStroke(x0: number, y0: number, x1: number, y1: number) {
        const mask = paintMasksRef.current[activeStep];
        const dab = dabRef.current;
        if (!mask || !dab) return;

        const w = mask.width;
        const h = mask.height;

        const dctx = dab.getContext("2d")!;
        dctx.clearRect(0, 0, w, h);

        // 1) ストローク
        dctx.save();
        dctx.globalCompositeOperation = "source-over";
        dctx.strokeStyle = "rgba(255,255,255,1)";
        dctx.lineCap = "round";
        dctx.lineJoin = "round";
        dctx.lineWidth = brushRadius * 2;
        dctx.beginPath();
        dctx.moveTo(x0, y0);
        dctx.lineTo(x1, y1);
        dctx.stroke();
        dctx.restore();

        // 2) 顔外をカット
        if (faceClipMask) {
            dctx.globalCompositeOperation = "destination-in";
            dctx.drawImage(faceClipMask, 0, 0);
        }
        // 3) 目の中をカット
        if (eyeHoleMask) {
            dctx.globalCompositeOperation = "destination-out";
            dctx.drawImage(eyeHoleMask, 0, 0);
        }
        // 4) リップなら唇内だけ
        if (activeStep === "lips" && lipAllowMask) {
            dctx.globalCompositeOperation = "destination-in";
            dctx.drawImage(lipAllowMask, 0, 0);
        }

        // 5) 本番マスクに反映（重ね塗り可能な方式）
        const mctx = mask.getContext("2d")!;

        if (mode === "paint") {
            /**
             * ☑ 重ね塗り実現ポイント
             * マスクは「白の濃さ = 塗った回数」にするため
             * dab の白を、既存マスクのαに “加算” していく。
             *
             * ⇒ destination-over で dab を重ねることで、
             *    既に描かれた白の上に、さらに薄い白が積み重なる。
             */
            mctx.globalCompositeOperation = "destination-over";

            // ここで dab が白(255) なので、マスクαが徐々に増加する
            mctx.globalAlpha = 0.2; // ← ☆☆ 重ね塗りの強さ（調整可）
            mctx.drawImage(dab, 0, 0);
        } else if (mode === "blur") {
            /**
             * ☑ ぼかし処理：濃い部分を薄くする
             * 塗った色は消さずに、はっきりし過ぎている部分の濃さを抑える。
             * destination-out で薄い消しゴム効果を適用し、マスクのα値を減少させる。
             */
            mctx.globalCompositeOperation = "destination-out";
            mctx.globalAlpha = 0.05; // ← ☆☆ ぼかし強度（値が大きいほど薄くなる）
            mctx.drawImage(dab, 0, 0);
        } else {
            // 消しゴム
            mctx.globalCompositeOperation = "destination-out";
            mctx.globalAlpha = 1;
            mctx.drawImage(dab, 0, 0);
        }

        // マスク更新を親に通知
        if (onStepMaskChange) {
            onStepMaskChange(activeStep, mask);
        }

        redraw();
    }

    // ===== ポインタ座標変換 =====
    function toLocal(e: React.PointerEvent<HTMLCanvasElement>) {
        const cv = displayRef.current!;
        const rect = cv.getBoundingClientRect();
        const x = ((e.clientX - rect.left) * cv.width) / rect.width;
        const y = ((e.clientY - rect.top) * cv.height) / rect.height;
        return { x, y };
    }

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        e.preventDefault();
        if (!displayRef.current) return;
        const { x, y } = toLocal(e);
        setIsDown(true);
        lastPt.current = { x, y };
        paintStroke(x, y, x, y); // ドット
    }

    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDown || !displayRef.current) return;
        e.preventDefault();
        const { x, y } = toLocal(e);
        const last = lastPt.current;
        if (!last) {
            lastPt.current = { x, y };
            return;
        }
        paintStroke(last.x, last.y, x, y);
        lastPt.current = { x, y };
    }

    function onPointerUp() {
        setIsDown(false);
        lastPt.current = null;
    }

    // 今のステップだけクリア
    function clearCurrentStep() {
        const mask = paintMasksRef.current[activeStep];
        if (!mask) return;
        const ctx = mask.getContext("2d")!;
        ctx.clearRect(0, 0, mask.width, mask.height);
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
                style={{
                    width: "100%",
                    touchAction: "none",
                    background: "#000",
                    display: "block",
                }}
            />

            {/* ガイド線（必要なら） */}
            {/* {guidePathD && (
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
            )} */}

            {/* <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={clearCurrentStep}>このステップの塗りをクリア</button>
            </div> */}
        </div>
    );
}
