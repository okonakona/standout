// src/app/editor/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { loadEditorImage, clearEditorImage } from "@/utils/imageSession";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PracticeCanvas from "@/components/editor/PracticeCanvas";
import { WebglMakeupCanvas } from "@/components/webgl/WebglMakeupCanvas";
import styles from "@/styles/editor.module.css";
import { useMasks } from "@/hooks/useMasks";
import { saveSim } from "@/utils/simStore";
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

export default function EditorPage() {
    const router = useRouter();
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [step, setStep] = useState<Step>("primer");

    const [brushRadius, setBrushRadius] = useState<number>(STEP_CONFIG.primer.defaultRadius);
    const [mode, setMode] = useState<"paint" | "erase">("paint");

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

    // ★ 2D 合成結果
    const [compositeCanvas, setCompositeCanvas] = useState<HTMLCanvasElement | null>(null);
    // ★ ステップごとのマスク
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

    const nextStep = () => {
        const i = ORDER.indexOf(step);
        setStep(ORDER[Math.min(ORDER.length - 1, i + 1)]);
    };
    const prevStep = () => {
        const i = ORDER.indexOf(step);
        setStep(ORDER[Math.max(0, i - 1)]);
    };

    const saveAndGoResult = async () => {
        const cv =
            document.querySelector<HTMLCanvasElement>(".practiceCanvas-webgl") ||
            document.querySelector<HTMLCanvasElement>(".practiceCanvas-2d");
        if (!cv) return;
        const url = cv.toDataURL("image/jpeg", 0.92);
        await saveSim(url, `step:${step}`);
        router.push("/result");
    };

    if (!img) return null;

    const cfg = STEP_CONFIG[step];

    // 今表示中の色
    const currentColor = colorByStep[step];
    const currentStrength = strengthByStep[step];

    // activeStep のマスク（なければ全体マスク無しで描画）
    const activeMask = maskByStep[step] || compositeCanvas; // fallback

    return (
        <main className={styles.editorWrap}>
            <section className={styles.canvasArea}>
                {loading && <p>パーツを解析中…</p>}
                {error && <p style={{ color: "crimson" }}>解析エラー: {error}</p>}

                <div style={{ position: "relative", inlineSize: "min(100%, 720px)" }}>
                    {/* 下：入力と 2D 合成 */}
                    <PracticeCanvas
                        image={img}
                        activeStep={step}
                        order={ORDER}
                        colorByStep={colorByStep}
                        strengthByStep={strengthByStep}
                        brushRadius={brushRadius}
                        mode={mode}
                        faceClipMask={masks?.faceClipMask ?? null}
                        // eyeHoleMask={masks?.eyeHoleMask ?? null}
                        lipAllowMask={masks?.lipAllowMask ?? null}
                        onCompositeChange={setCompositeCanvas}
                        onStepMaskChange={(s, mask) =>
                            setMaskByStep((prev) => ({ ...prev, [s]: mask }))
                        }
                    />

                    {/* 上：WebGL 質感オーバーレイ */}
                    {compositeCanvas && activeMask && (
                        <WebglMakeupCanvas
                            base={compositeCanvas}
                            mask={activeMask}
                            tintColor={currentColor}
                            strength={currentStrength}
                            effectId={cfg.effectId}
                        />
                    )}
                </div>
            </section>

            <aside className={styles.sidePanel}>
                <h2>ステップ：{cfg.label}</h2>

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

                    {/* 強さは固定表示 */}
                    <div className={styles.toolRow}>
                        <label>強さ：</label>
                        <span>{Math.round(cfg.defaultStrength * 100)}%</span>
                    </div>

                    {/* ブラシ太さ */}
                    <div className={styles.toolRow}>
                        <label>ブラシ太さ：</label>
                        {cfg.allowedRadii && cfg.allowedRadii.length > 1 ? (
                            <div className={styles.brushSizeButtons}>
                                {cfg.allowedRadii.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setBrushRadius(r)}
                                        aria-pressed={brushRadius === r}
                                    >
                                        {r === 10
                                            ? "大"
                                            : r === 7
                                            ? "中"
                                            : r === 4
                                            ? "小"
                                            : r <= 1
                                            ? "極細"
                                            : `${r}px`}
                                    </button>
                                ))}
                                <span style={{ marginLeft: 8 }}>{brushRadius}px</span>
                            </div>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="range"
                                    min={cfg.defaultRadius}
                                    max={cfg.defaultRadius}
                                    value={cfg.defaultRadius}
                                    disabled
                                />
                                <span>{cfg.defaultRadius}px（固定）</span>
                            </div>
                        )}
                    </div>

                    {/* 色変更：ステップごとの色テーブルを更新 */}
                    <div className={styles.toolRow}>
                        <label>色：</label>
                        <input
                            type="color"
                            value={currentColor}
                            onChange={(e) =>
                                setColorByStep((prev) => ({ ...prev, [step]: e.target.value }))
                            }
                        />
                        <span>{currentColor}</span>
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
