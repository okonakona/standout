"use client";
import React, { useEffect, useRef, useState } from "react";
import { loadEditorImage, clearEditorImage } from "@/utils/imageSession";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/styles/editor.module.css";
import { applyBase, applyLips, applyBrows, applyEyes, Step } from "@/lib/effects";

export default function EditorPage() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [step, setStep] = useState<Step>("base");

    // 画像読み込み
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

    // 初期描画
    useEffect(() => {
        if (!img || !canvasRef.current) return;
        const cv = canvasRef.current,
            ctx = cv.getContext("2d")!;
        cv.width = img.width;
        cv.height = img.height;
        ctx.drawImage(img, 0, 0);
    }, [img]);

    const applyAndNext = () => {
        if (!canvasRef.current) return;
        const cv = canvasRef.current,
            ctx = cv.getContext("2d")!;
        const src = ctx.getImageData(0, 0, cv.width, cv.height);
        let out: ImageData;
        if (step === "base") out = applyBase(src);
        else if (step === "lips") out = applyLips(src);
        else if (step === "brows") out = applyBrows(src);
        else out = applyEyes(src);
        ctx.putImageData(out, 0, 0);

        // 次のステップへ
        setStep((prev) => {
            if (prev === "base") return "lips";
            if (prev === "lips") return "brows";
            if (prev === "brows") return "eyes";
            return "eyes";
        });
    };

    const resetImage = () => {
        if (!img || !canvasRef.current) return;
        const cv = canvasRef.current,
            ctx = cv.getContext("2d")!;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0);
        setStep("base");
    };

    if (!img) return null;

    const stepLabel = { base: "下地", lips: "唇", brows: "眉", eyes: "目" }[step];

    return (
        <main className={styles.editorWrap}>
            <section className={styles.canvasArea}>
                <canvas ref={canvasRef} className={styles.canvas} />
            </section>

            <aside className={styles.sidePanel}>
                <h2>ステップ：{stepLabel}</h2>
                <div className={styles.buttons}>
                    <button onClick={applyAndNext}>このステップをボタンで適用</button>
                    <button onClick={resetImage}>やり直す</button>
                </div>

                <div className={styles.nav}>
                    <Link href="/result">結果へ</Link>
                    <button
                        onClick={() => {
                            clearEditorImage();
                            router.push("/upload");
                        }}
                    >
                        画像を変える
                    </button>
                </div>

                <p className={styles.note}>
                    ※いまはデモとして全体へ軽い効果を適用しています（分割前のMVP）。
                    後でパーツマスクに限定して適用（完全オンデバイス推論）に差し替えます。
                </p>
            </aside>
        </main>
    );
}
