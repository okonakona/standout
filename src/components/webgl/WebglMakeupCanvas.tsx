// src/components/webgl/WebglMakeupCanvas.tsx
"use client";
import React, { useEffect, useRef } from "react";
import { initMakeupGl } from "@/lib/webgl/initMakeupGl";
import type { MakeupGlContext } from "@/lib/webgl/initMakeupGl";

type Props = {
    base: HTMLCanvasElement | HTMLImageElement; // 元の顔画像
    mask: HTMLCanvasElement; // activeStep のマスク
    tintColor: string; // #rrggbb
    strength: number; // 0..1
    effectId: number; // STEP_CONFIG の effectId
    textureType?: number; // 0: マット, 1: クリーム, 2: パウダー
    drawVersion?: number; // 描画が発生したときにインクリメントされるカウンター
};

// HEX色をRGBA配列に変換
function hexToRGBA(hex: string): [number, number, number, number] {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b, 1.0];
}

export function WebglMakeupCanvas({
    base,
    mask,
    tintColor,
    strength,
    effectId,
    textureType = 0,
    drawVersion = 0,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<MakeupGlContext | null>(null);

    // 初期化：baseが変わったときだけWebGLコンテキストを作り直す
    useEffect(() => {
        if (!canvasRef.current) return;
        if (!base) return;

        let img: HTMLImageElement;

        if (base instanceof HTMLImageElement) {
            img = base;
        } else {
            // CanvasをImageに変換
            img = new Image();
            img.src = base.toDataURL();
        }

        img.onload = async () => {
            if (!canvasRef.current) return;

            // キャンバスサイズを画像に合わせる
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;

            // WebGLコンテキスト初期化
            const ctx = await initMakeupGl(canvasRef.current, img, mask);
            ctxRef.current = ctx;

            // 初回描画
            ctx.render({
                tintColor: hexToRGBA(tintColor),
                strength,
                textureType,
            });
        };

        if (img.complete) {
            img.onload(null as any);
        }

        return () => {
            ctxRef.current = null;
        };
    }, [base]);

    // tintColor, strength, textureType, drawVersion が変わったら再描画
    useEffect(() => {
        if (!ctxRef.current) return;

        ctxRef.current.updateMaskFromCanvas(mask);
        ctxRef.current.render({
            tintColor: hexToRGBA(tintColor),
            strength,
            textureType,
        });
    }, [mask, tintColor, strength, textureType, drawVersion]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
            }}
        />
    );
}
