// src/components/editor/PracticeCanvas.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";

type Step = "base" | "lips" | "brows" | "eyes";

type Props = {
    image: HTMLImageElement;
    step: Step;
    brushRadius: number;
    brushStrength: number;
    colorHex: string;
    mode: "paint" | "erase";
    partMask: HTMLCanvasElement | null;
    guidePathD?: string;
    guideBandPx?: number;
};

export default function PracticeCanvas({
    image,
    step,
    brushRadius,
    brushStrength,
    colorHex,
    mode,
    partMask,
    guidePathD,
    guideBandPx,
}: Props) {
    const displayRef = useRef<HTMLCanvasElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const [isDown, setIsDown] = useState(false);
    const lastPt = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const w = image.width,
            h = image.height;
        if (displayRef.current) {
            displayRef.current.width = w;
            displayRef.current.height = h;
        }
        if (maskRef.current) {
            maskRef.current.width = w;
            maskRef.current.height = h;
        }
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image, step, partMask]);

    function redraw() {
        if (!displayRef.current || !maskRef.current) return;
        const dcv = displayRef.current,
            dctx = dcv.getContext("2d")!;
        const mcv = maskRef.current;

        dctx.clearRect(0, 0, dcv.width, dcv.height);
        dctx.drawImage(image, 0, 0);

        // 色レイヤ（視覚濃度は brushStrength）
        const tmp = new OffscreenCanvas(dcv.width, dcv.height);
        const tctx = tmp.getContext("2d")!;
        tctx.fillStyle = colorHex;
        tctx.globalAlpha = brushStrength;
        tctx.fillRect(0, 0, dcv.width, dcv.height);

        // AND 1: ユーザー塗布マスク
        tctx.globalCompositeOperation = "destination-in";
        tctx.drawImage(mcv, 0, 0);

        // AND 2: パーツマスク
        if (partMask) {
            tctx.globalCompositeOperation = "destination-in";
            tctx.drawImage(partMask, 0, 0);
        }

        // 仕上げ：乗算ブレンドで表示に合成
        dctx.globalCompositeOperation = "multiply";
        dctx.drawImage(tmp, 0, 0);
        dctx.globalCompositeOperation = "source-over";
    }

    function paintLine(x0: number, y0: number, x1: number, y1: number) {
        if (!maskRef.current) return;
        const ctx = maskRef.current.getContext("2d")!;
        ctx.save();
        if (mode === "paint") {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = "rgba(255,255,255,1)";
        } else {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = brushRadius * 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
        redraw();
    }
    function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (e.currentTarget.width / rect.width);
        const y = (e.clientY - rect.top) * (e.currentTarget.height / rect.height);
        return { x, y };
    }
    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        const { x, y } = getPos(e);
        setIsDown(true);
        lastPt.current = { x, y };
        paintLine(x, y, x, y);
    }
    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDown || !displayRef.current) return;
        const { x, y } = getPos(e);
        const last = lastPt.current;
        if (!last) {
            lastPt.current = { x, y };
            return;
        }
        // 5px 間隔で補間
        const dx = x - last.x,
            dy = y - last.y,
            dist = Math.hypot(dx, dy),
            step = 5;
        if (dist <= step) {
            paintLine(last.x, last.y, x, y);
            lastPt.current = { x, y };
            return;
        }
        const nx = dx / dist,
            ny = dy / dist;
        let px = last.x,
            py = last.y;
        for (let t = step; t <= dist; t += step) {
            const qx = last.x + nx * t,
                qy = last.y + ny * t;
            paintLine(px, py, qx, qy);
            px = qx;
            py = qy;
        }
        lastPt.current = { x, y };
    }
    function onPointerUp() {
        setIsDown(false);
        lastPt.current = null;
    }

    function clearMask() {
        if (!maskRef.current) return;
        const ctx = maskRef.current.getContext("2d")!;
        ctx.clearRect(0, 0, maskRef.current.width, maskRef.current.height);
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
                }}
            />
            <canvas ref={maskRef} style={{ display: "none" }} />
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
                <button onClick={clearMask}>このステップの塗りをクリア</button>
            </div>
        </div>
    );
}
