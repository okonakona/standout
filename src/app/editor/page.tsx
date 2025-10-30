// src/app/editor/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { loadEditorImage, clearEditorImage } from "@/utils/imageSession";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PracticeCanvas from "@/components/editor/PracticeCanvas";
import styles from "@/styles/editor.module.css";
import { useMasks } from "@/hooks/useMasks";
import { maskToSvgPath } from "@/lib/geometry";
import { saveSim } from "@/utils/simStore";

type Step = "base" | "lips" | "brows" | "eyes";

export default function EditorPage() {
    const router = useRouter();
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [step, setStep] = useState<Step>("base");

    const [brushRadius, setBrushRadius] = useState<number>(18);
    const [brushStrength, setBrushStrength] = useState<number>(0.35);
    const [mode, setMode] = useState<"paint" | "erase">("paint");
    const [colorHex, setColorHex] = useState<string>("#d06a6a");

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

    useEffect(() => {
        if (step === "base") setColorHex("#ffffff");
        if (step === "lips") setColorHex("#ce4e5a");
        if (step === "brows") setColorHex("#4a3b32");
        if (step === "eyes") setColorHex("#3a3a55");
    }, [step]);

    if (!img) return null;

    const partMask = masks
        ? step === "lips"
            ? masks.lips
            : step === "brows"
            ? masks.brows
            : step === "eyes"
            ? masks.eyes
            : masks.skin
        : null;

    const guidePathD = partMask ? maskToSvgPath(partMask) : "";
    const guideBandPx = 3;

    const nextStep = () =>
        setStep((s) =>
            s === "base" ? "lips" : s === "lips" ? "brows" : s === "brows" ? "eyes" : "eyes"
        );
    const prevStep = () =>
        setStep((s) => (s === "eyes" ? "brows" : s === "brows" ? "lips" : "base"));

    const saveAndGoResult = async () => {
        const cv = document.querySelector<HTMLCanvasElement>("canvas.practiceCanvas");
        if (!cv) return;
        const url = cv.toDataURL("image/jpeg", 0.92);
        await saveSim(url, `step:${step}`);
        router.push("/result");
    };

    return (
        <main className={styles.editorWrap}>
            <section className={styles.canvasArea}>
                {loading && <p>パーツを解析中…</p>}
                {error && <p style={{ color: "crimson" }}>解析エラー: {error}</p>}

                <PracticeCanvas
                    image={img}
                    step={step}
                    brushRadius={brushRadius}
                    brushStrength={brushStrength}
                    colorHex={colorHex}
                    mode={mode}
                    partMask={partMask}
                    guidePathD={guidePathD}
                    guideBandPx={guideBandPx}
                />
            </section>

            <aside className={styles.sidePanel}>
                <h2>ステップ：{{ base: "下地", lips: "唇", brows: "眉", eyes: "目" }[step]}</h2>

                <div className={styles.tools}>
                    <div className={styles.toolRow}>
                        <label>モード：</label>
                        <button onClick={() => setMode("paint")} aria-pressed={mode === "paint"}>
                            塗る
                        </button>
                        <button onClick={() => setMode("erase")} aria-pressed={mode === "erase"}>
                            消す
                        </button>
                    </div>

                    <div className={styles.toolRow}>
                        <label>ブラシ半径：</label>
                        <input
                            type="range"
                            min={4}
                            max={60}
                            value={brushRadius}
                            onChange={(e) => setBrushRadius(+e.target.value)}
                        />
                        <span>{brushRadius}px</span>
                    </div>

                    <div className={styles.toolRow}>
                        <label>強さ：</label>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={brushStrength}
                            onChange={(e) => setBrushStrength(+e.target.value)}
                        />
                        <span>{brushStrength.toFixed(2)}</span>
                    </div>

                    <div className={styles.toolRow}>
                        <label>色：</label>
                        <input
                            type="color"
                            value={colorHex}
                            onChange={(e) => setColorHex(e.target.value)}
                        />
                        <span>{colorHex}</span>
                    </div>
                </div>

                <div className={styles.buttons}>
                    <button onClick={prevStep} disabled={step === "base"}>
                        ← 戻る
                    </button>
                    <button onClick={nextStep}>次のステップ →</button>
                </div>

                <div className={styles.nav}>
                    <button onClick={saveAndGoResult}>結果を保存して見る</button>
                    <Link href="/result">結果だけ見る</Link>
                    <button
                        onClick={() => {
                            clearEditorImage();
                            router.push("/upload");
                        }}
                    >
                        画像を変える
                    </button>
                </div>
            </aside>
        </main>
    );
}
