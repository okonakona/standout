// src/app/editor/page.tsx
"use client";
import React, { useEffect, useState } from "react";
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

    // ステップ移動
    const nextStep = () => {
        const i = ORDER.indexOf(step);
        if (i < ORDER.length - 1) {
            setStep(ORDER[i + 1]);
            // 次のステップに合わせてブラシ半径を更新
            const next = ORDER[i + 1];
            setBrushRadius(STEP_CONFIG[next].defaultRadius);
        }
    };

    const prevStep = () => {
        const i = ORDER.indexOf(step);
        if (i > 0) {
            setStep(ORDER[i - 1]);
            const prev = ORDER[i - 1];
            setBrushRadius(STEP_CONFIG[prev].defaultRadius);
        }
    };

    // 最終結果を保存して /result へ
    const saveAndGoResult = async () => {
        // WebGL があればそれを優先、なければ 2D を保存
        const cv =
            document.querySelector<HTMLCanvasElement>(".practiceCanvas-webgl") ||
            document.querySelector<HTMLCanvasElement>(".practiceCanvas-2d");

        if (!cv) return;
        const url = cv.toDataURL("image/jpeg", 0.92);

        // ラベルは "final" として保存（履歴用途）
        await saveSim(url, "final");
        router.push("/result");
    };

    if (!img) return null;

    const cfg = STEP_CONFIG[step];

    const currentColor = colorByStep[step];
    const currentStrength = strengthByStep[step];

    // activeStep のマスク（なければ全体）
    const activeMask = maskByStep[step] || compositeCanvas;

    const isFirst = ORDER.indexOf(step) === 0;
    const isLast = step === "lips";

    return (
        <main className={styles.editorWrap}>
            <section className={styles.canvasArea}>
                {loading && <p>パーツを解析中…</p>}
                {error && <p style={{ color: "crimson" }}>解析エラー: {error}</p>}

                <div>
                    {/* 下：2D 編集＆合成 */}
                    <PracticeCanvas
                        image={img}
                        activeStep={step}
                        order={ORDER}
                        colorByStep={colorByStep}
                        strengthByStep={strengthByStep}
                        brushRadius={brushRadius}
                        mode={mode}
                        faceClipMask={masks?.faceClipMask ?? null}
                        lipAllowMask={masks?.lipAllowMask ?? null}
                        onCompositeChange={setCompositeCanvas}
                        onStepMaskChange={(s, mask) =>
                            setMaskByStep((prev) => ({
                                ...prev,
                                [s]: mask,
                            }))
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

                    {/* 強さ：固定表示 */}
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

                    {/* 色：ステップごとの色を更新 */}
                    <div className={styles.toolRow}>
                        <label>色：</label>
                        <input
                            type="color"
                            value={currentColor}
                            onChange={(e) =>
                                setColorByStep((prev) => ({
                                    ...prev,
                                    [step]: e.target.value,
                                }))
                            }
                        />
                        <span>{currentColor}</span>
                    </div>
                </div>

                {/* ステップ移動＆OK フロー */}
                <div className={styles.buttons}>
                    <button onClick={prevStep} disabled={isFirst}>
                        ← 前のステップに戻る
                    </button>

                    {!isLast ? (
                        <button onClick={nextStep}>このステップはOK → 次へ</button>
                    ) : (
                        <button onClick={saveAndGoResult}>メイク完了（結果を保存して見る）</button>
                    )}
                </div>

                {/* 共通ナビ：履歴と画像差し替え */}
                {/* <div className={styles.nav}>
                    <Link href="/result">履歴（これまでのメイク結果）を見る</Link>
                    <button
                        onClick={() => {
                            clearEditorImage();
                            router.push("/upload");
                        }}
                    >
                        画像を撮り直す
                    </button>
                </div> */}
            </aside>
        </main>
    );
}
