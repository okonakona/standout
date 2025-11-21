// src/components/editor/PracticeCanvas.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { makeBrushStamp } from "@/lib/brushTex";
import { STEP_CONFIG, Step } from "@/types/steps";

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
};

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
}: Props) {
    // 表示用キャンバス
    const displayRef = useRef<HTMLCanvasElement | null>(null);
    // 元画像を貼り付けるベースキャンバス
    const baseCvRef = useRef<HTMLCanvasElement | null>(null);
    // ステップごとの「手描きマスク」（白α＝塗った量）
    const paintMasksRef = useRef<Record<Step, HTMLCanvasElement>>({} as any);

    const [isDown, setIsDown] = useState(false);
    const lastPt = useRef<{ x: number; y: number } | null>(null);

    // 現在ステップの設定（ブラシ種別だけ参照）
    const cfg = STEP_CONFIG[activeStep];
    const stamp = useMemo(
        () => makeBrushStamp(cfg.brush, Math.max(1, brushRadius)),
        [cfg.brush, brushRadius]
    );

    // 画像変更時：キャンバスのサイズを初期化
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

        // ベースキャンバス（元画像）
        if (!baseCvRef.current) baseCvRef.current = document.createElement("canvas");
        baseCvRef.current.width = w;
        baseCvRef.current.height = h;
        const bctx = baseCvRef.current.getContext("2d")!;
        bctx.clearRect(0, 0, w, h);
        bctx.drawImage(image, 0, 0, w, h);

        // ステップごとのマスクキャンバスを用意（中身は保持）
        const next: Record<Step, HTMLCanvasElement> = { ...paintMasksRef.current };
        order.forEach((s) => {
            if (!next[s]) next[s] = document.createElement("canvas");
            // サイズだけ更新（中身は自動でスケーリングされないので、本当にサイズ変更したくないならここで工夫も可）
            next[s].width = w;
            next[s].height = h;
        });
        paintMasksRef.current = next;

        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image, order]);

    // 色や強さ・マスク系が変わったら再合成
    useEffect(() => {
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorByStep, strengthByStep, faceClipMask, eyeHoleMask, lipAllowMask]);

    // ===== 画面全体の再合成 =====
    function redraw() {
        const out = displayRef.current;
        const baseCv = baseCvRef.current;
        if (!out || !baseCv) return;

        const octx = out.getContext("2d")!;
        const w = out.width;
        const h = out.height;

        // 0) クリア
        octx.clearRect(0, 0, w, h);

        // 1) ベース画像
        octx.globalCompositeOperation = "source-over";
        octx.globalAlpha = 1;
        octx.drawImage(baseCv, 0, 0);

        // 2) 各ステップのレイヤーを順番に重ねる
        for (const step of order) {
            const mask = paintMasksRef.current[step];
            if (!mask) continue;

            const color = colorByStep[step];
            const stepCfg = STEP_CONFIG[step];

            // マスクが完全に空でも描画しても問題はない（α=0なので何も出ない）

            // 単色塗りキャンバス
            const tint = document.createElement("canvas");
            tint.width = w;
            tint.height = h;
            const tctx = tint.getContext("2d")!;
            tctx.fillStyle = color;
            tctx.fillRect(0, 0, w, h);

            // 色 + マスク の合成
            const painted = document.createElement("canvas");
            painted.width = w;
            painted.height = h;
            const pd = painted.getContext("2d")!;
            pd.globalCompositeOperation = "source-over";
            pd.drawImage(tint, 0, 0);

            // 手描きマスクでくり抜き（ここに“重ね塗り回数”のαが入っている）
            pd.globalCompositeOperation = "destination-in";
            pd.drawImage(mask, 0, 0);

            // さらに顔の輪郭や目・唇で制限したい場合（念のためもう一度かけておく）
            if (faceClipMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(faceClipMask, 0, 0);
            }
            if (eyeHoleMask) {
                pd.globalCompositeOperation = "destination-out";
                pd.drawImage(eyeHoleMask, 0, 0);
            }
            if (step === "lips" && lipAllowMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(lipAllowMask, 0, 0);
            }

            // 出力キャンバスにブレンドモードで重ねる
            octx.globalCompositeOperation = stepCfg.blend as GlobalCompositeOperation;
            // ★ ここは alpha=1 固定。濃さは mask の α に任せる（＝重ね塗り効果）
            octx.globalAlpha = 1;
            octx.drawImage(painted, 0, 0);
        }

        // 後片付け
        octx.globalCompositeOperation = "source-over";
        octx.globalAlpha = 1;
    }

    // ===== 手描き処理：現在アクティブなステップのマスクにのみ描く =====
    function paintDot(x: number, y: number) {
        const mask = paintMasksRef.current[activeStep];
        if (!mask) return;

        const w = mask.width;
        const h = mask.height;

        // 1) スタンプを置く一時キャンバス（dab）
        const dab = document.createElement("canvas");
        dab.width = w;
        dab.height = h;
        const dctx = dab.getContext("2d")!;
        dctx.globalCompositeOperation = "source-over";
        dctx.drawImage(stamp, x - brushRadius, y - brushRadius);

        // 2) 顔外をカット
        if (faceClipMask) {
            dctx.globalCompositeOperation = "destination-in";
            dctx.drawImage(faceClipMask, 0, 0);
        }
        // 3) 目の中は常に禁止
        if (eyeHoleMask) {
            dctx.globalCompositeOperation = "destination-out";
            dctx.drawImage(eyeHoleMask, 0, 0);
        }
        // 4) リップのときだけ唇内に限定
        if (activeStep === "lips" && lipAllowMask) {
            dctx.globalCompositeOperation = "destination-in";
            dctx.drawImage(lipAllowMask, 0, 0);
        }

        // 5) 実際のマスクキャンバスに合成
        const ctx = mask.getContext("2d")!;
        if (mode === "erase") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1;
        } else {
            ctx.globalCompositeOperation = "source-over";
            // ★ 1回のストローク分の濃さ（STEP_CONFIG から渡された値）
            ctx.globalAlpha = strengthByStep[activeStep];
        }
        ctx.drawImage(dab, 0, 0);
        ctx.globalAlpha = 1;
    }

    // 線で塗る（途中点を補間して paintDot を連続適用）
    function paintLine(x0: number, y0: number, x1: number, y1: number) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) {
            paintDot(x0, y0);
            return;
        }

        const stepPx = Math.max(brushRadius * 0.5, 2); // 間隔が広すぎないように
        const steps = Math.ceil(dist / stepPx);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x0 + dx * t;
            const y = y0 + dy * t;
            paintDot(x, y);
        }

        redraw();
    }

    // 画面座標 → キャンバス座標
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
        redraw();
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

    // 現在ステップだけクリア
    function clearCurrentStep() {
        const mask = paintMasksRef.current[activeStep];
        if (!mask) return;
        const ctx = mask.getContext("2d")!;
        ctx.clearRect(0, 0, mask.width, mask.height);
        redraw();
    }

    return (
        <div style={{ position: "relative", inlineSize: "min(100%, 720px)" }}>
            <canvas
                ref={displayRef}
                className="practiceCanvas"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{
                    width: "100%",
                    height: "auto",
                    touchAction: "none",
                    border: "1px solid #ddd",
                    background: "#000",
                    display: "block",
                }}
            />

            {/* ガイドの SVG レイヤ */}
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
                        strokeWidth="2"
                    />
                </svg>
            )}

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={clearCurrentStep}>このステップの塗りをクリア</button>
            </div>
        </div>
    );
}
