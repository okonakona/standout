// 手順とガイド・クリップの配線を実装
// src/app/editor/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { loadEditorImage, clearEditorImage } from "@/utils/imageSession";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PracticeCanvas from "@/components/editor/PracticeCanvas";
import styles from "@/styles/editor.module.css";
import { useMasks } from "@/hooks/useMasks";
import { saveSim } from "@/utils/simStore";
import { STEP_CONFIG, Step } from "@/types/steps";
import { guidePathForStep } from "@/lib/guidePaths";
import type { PartMasks as LmPartMasks } from "@/lib/faceLandmarks";

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

export default function EditorPage() {
    const router = useRouter();
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [step, setStep] = useState<Step>("primer");

    const [brushRadius, setBrushRadius] = useState<number>(18);
    const [mode, setMode] = useState<"paint" | "erase">("paint");

    // --- ステップごとの色と強さを保持 ---
    const [colorByStep, setColorByStep] = useState<Record<Step, string>>(() => {
        const init: Record<Step, string> = {} as any;
        ORDER.forEach((s) => (init[s] = STEP_CONFIG[s].defaultColor));
        return init;
    });
    const [strengthByStep, setStrengthByStep] = useState<Record<Step, number>>(() => {
        const init: Record<Step, number> = {} as any;
        ORDER.forEach((s) => (init[s] = STEP_CONFIG[s].defaultStrength));
        return init;
    });

    // 表示用の現在値
    const colorHex = colorByStep[step];
    const brushStrength = strengthByStep[step];

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

    // ランドマーク系マスク（ある場合だけガイド/クリップに使用）
    const { masks, loading, error } = useMasks(img);
    const lmMasks: LmPartMasks | null = useMemo(() => {
        if (!masks) return null;
        return "faceClipMask" in (masks as any) ? (masks as unknown as LmPartMasks) : null;
    }, [masks]);

    const guidePathD = useMemo(() => {
        if (!lmMasks) return "";
        return guidePathForStep(step, lmMasks);
    }, [lmMasks, step]);

    const nextStep = () => {
        const i = ORDER.indexOf(step);
        setStep(ORDER[Math.min(ORDER.length - 1, i + 1)]);
    };
    const prevStep = () => {
        const i = ORDER.indexOf(step);
        setStep(ORDER[Math.max(0, i - 1)]);
    };

    const saveAndGoResult = async () => {
        const cv = document.querySelector<HTMLCanvasElement>("canvas.practiceCanvas");
        if (!cv) return;
        const url = cv.toDataURL("image/jpeg", 0.92);
        await saveSim(url, `step:${step}`);
        router.push("/result");
    };

    if (!img) return null;

    return (
        <main className={styles.editorWrap}>
            <section className={styles.canvasArea}>
                {loading && <p>パーツを解析中…</p>}
                {error && <p style={{ color: "crimson" }}>解析エラー: {error}</p>}

                <PracticeCanvas
                    image={img}
                    activeStep={step}
                    order={ORDER}
                    // ステップごとの状態をまとめて渡す
                    colorByStep={colorByStep}
                    strengthByStep={strengthByStep}
                    // UI操作での一時的なブラシ・モード
                    brushRadius={brushRadius}
                    mode={mode}
                    // 顔はみ出し防止
                    faceClipMask={lmMasks?.faceClipMask ?? null}
                    // ガイド
                    guidePathD={guidePathD}
                    guideBandPx={3}
                />
            </section>

            <aside className={styles.sidePanel}>
                <h2>ステップ：{STEP_CONFIG[step].label}</h2>

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
                            onChange={(e) =>
                                setStrengthByStep((prev) => ({ ...prev, [step]: +e.target.value }))
                            }
                        />
                        <span>{brushStrength.toFixed(2)}</span>
                    </div>

                    <div className={styles.toolRow}>
                        <label>色：</label>
                        <input
                            type="color"
                            value={colorHex}
                            onChange={(e) =>
                                setColorByStep((prev) => ({ ...prev, [step]: e.target.value }))
                            }
                        />
                        <span>{colorHex}</span>
                    </div>
                </div>

                <div className={styles.buttons}>
                    <button onClick={prevStep} disabled={ORDER.indexOf(step) === 0}>
                        ← 戻る
                    </button>
                    <button onClick={nextStep} disabled={ORDER.indexOf(step) === ORDER.length - 1}>
                        次のステップ →
                    </button>
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
