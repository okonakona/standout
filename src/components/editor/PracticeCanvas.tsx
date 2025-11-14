// src/components/editor/PracticeCanvas.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { makeBrushStamp } from "@/lib/brushTex";
import { STEP_CONFIG, Step } from "@/types/steps";

type Props = {
    image: HTMLImageElement;
    activeStep: Step; // 編集中ステップ
    order: Step[]; // 合成順
    colorByStep: Record<Step, string>; // ステップごとの色
    strengthByStep: Record<Step, number>; // ステップごとの強さ(0..1)
    brushRadius: number;
    mode: "paint" | "erase";
    faceClipMask: HTMLCanvasElement | null; // 顔クリップ
    guidePathD?: string;
    guideBandPx?: number;
    partMask?: HTMLCanvasElement | null; // 任意（使わない想定）
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
    guidePathD,
    guideBandPx,
    partMask = null,
}: Props) {
    const displayRef = useRef<HTMLCanvasElement | null>(null); // 出力
    const baseCvRef = useRef<HTMLCanvasElement | null>(null); // 元画像
    // ステップごとの手描き α マスク
    const paintMasksRef = useRef<Record<Step, HTMLCanvasElement>>({} as any);

    const [isDown, setIsDown] = useState(false);
    const lastPt = useRef<{ x: number; y: number } | null>(null);

    // 現在のステップ設定（ブレンド・ブラシ種別など）
    const cfg = STEP_CONFIG[activeStep];
    const stamp = useMemo(
        () => makeBrushStamp(cfg.brush, Math.max(1, brushRadius)),
        [cfg.brush, brushRadius]
    );

    // 初期化（画像サイズに合わせて各キャンバス準備）
    useEffect(() => {
        const w = image.width,
            h = image.height;

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

        // 各ステップのマスクキャンバスを用意（無ければ作成、あればリサイズ）
        const next: Record<Step, HTMLCanvasElement> = { ...paintMasksRef.current };
        order.forEach((s) => {
            if (!next[s]) next[s] = document.createElement("canvas");
            next[s].width = w;
            next[s].height = h;
            // 既存内容はそのまま（初期化しない）→ 以前の塗りを保持
        });
        paintMasksRef.current = next;

        redraw(); // 初期合成
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image, order]);

    // 表示の再合成（色/強さ/顔クリップ/ガイド/ステップ変更時）
    useEffect(() => {
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorByStep, strengthByStep, faceClipMask, activeStep]);

    // === 合成：全ステップを順番に重ねる ===
    function redraw() {
        if (!displayRef.current || !baseCvRef.current) return;
        const out = displayRef.current;
        const octx = out.getContext("2d")!;
        const w = out.width,
            h = out.height;

        octx.clearRect(0, 0, w, h);
        octx.globalCompositeOperation = "source-over";
        octx.globalAlpha = 1;

        // 1) 元画像
        octx.drawImage(baseCvRef.current, 0, 0);

        // 2) 各ステップを順番に合成
        for (const s of order) {
            const mask = paintMasksRef.current[s];
            if (!mask) continue;

            // 何も塗っていないレイヤをスキップ（透明チェック）
            // ピクセル走査は重いので、getImageDataは避け、簡易に幅高ゼロならスキップ程度に留める
            // 実デモではそのまま描画しても問題ないため描画継続
            const col = colorByStep[s];
            const alpha = Math.max(0, Math.min(1, strengthByStep[s]));
            const scfg = STEP_CONFIG[s];

            // 単色キャンバス作成
            const tint = document.createElement("canvas");
            tint.width = w;
            tint.height = h;
            const tctx = tint.getContext("2d")!;
            tctx.fillStyle = col;
            tctx.fillRect(0, 0, w, h);

            // 色 ×（ユーザー塗布 α）
            const painted = document.createElement("canvas");
            painted.width = w;
            painted.height = h;
            const pd = painted.getContext("2d")!;
            pd.globalCompositeOperation = "source-over";
            pd.drawImage(tint, 0, 0);
            pd.globalCompositeOperation = "destination-in";
            pd.drawImage(mask, 0, 0);

            // 任意のパーツマスクでさらに絞る（基本は使わない）
            if (partMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(partMask, 0, 0);
            }

            // 顔クリップ（はみ出し防止）
            if (faceClipMask) {
                pd.globalCompositeOperation = "destination-in";
                pd.drawImage(faceClipMask, 0, 0);
            }

            // 仕上げ：ブレンド＆強さ
            octx.globalCompositeOperation =
                (scfg.blend as GlobalCompositeOperation) || "source-over";
            octx.globalAlpha = alpha;
            octx.drawImage(painted, 0, 0);
            octx.globalAlpha = 1;
            octx.globalCompositeOperation = "source-over";
        }
    }

    // === 手描き：現在ステップのマスクにだけ描く ===
    function paintDot(x: number, y: number) {
        const mask = paintMasksRef.current[activeStep];
        if (!mask) return;
        const ctx = mask.getContext("2d")!;
        ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        ctx.drawImage(stamp, x - brushRadius, y - brushRadius);
        redraw();
    }

    function paintLine(x0: number, y0: number, x1: number, y1: number) {
        const dist = Math.hypot(x1 - x0, y1 - y0);
        if (dist === 0) {
            paintDot(x0, y0);
            return;
        }
        const stepPx = Math.max(1, brushRadius * 0.6);
        const nx = (x1 - x0) / dist,
            ny = (y1 - y0) / dist;
        for (let t = 0; t <= dist; t += stepPx) paintDot(x0 + nx * t, y0 + ny * t);
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
