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

    const [brushRadius, setBrushRadius] = useState<number>(STEP_CONFIG.primer.defaultRadius);
    const [brushStrength, setBrushStrength] = useState<number>(STEP_CONFIG.primer.defaultStrength);
    const [mode, setMode] = useState<"paint" | "erase">("paint");
    const [colorHex, setColorHex] = useState<string>(STEP_CONFIG.primer.defaultColor);

    // step が変わったら、そのステップのデフォルト値にリセット
    useEffect(() => {
        const cfg = STEP_CONFIG[step];
        setColorHex(cfg.defaultColor);
        setBrushStrength(cfg.defaultStrength); // ← 強さは常に固定値
        setBrushRadius(cfg.defaultRadius); // ← 太さもステップのデフォルトから開始
    }, [step]);

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

    // useMasksは faceClipMask/eyeHoleMask のみ返すため、
    // guidePathForStepで必要な PartMasks 型とは異なる
    // MediaPipe失敗時はガイドライン無しで動作
    const lmMasks: LmPartMasks | null = useMemo(() => {
        if (!masks) return null;
        // buildClipMasksFromLandmarks の戻り値には lips, brows, eyes, skin がないため
        // ガイドライン機能は現在無効（フリーペイントモード）
        return null;
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
    // 追加：現在ステップの設定を取り出す
    const cfg = STEP_CONFIG[step];

    return (
        <main className={styles.editorWrap}>
            <section className={styles.canvasArea}>
                {loading && <p>パーツを解析中…</p>}
                {error && <p style={{ color: "crimson" }}>解析エラー: {error}</p>}

                <PracticeCanvas
                    image={img}
                    activeStep={step}
                    order={ORDER}
                    colorByStep={colorByStep}
                    strengthByStep={strengthByStep}
                    brushRadius={brushRadius}
                    mode={mode}
                    faceClipMask={masks?.faceClipMask ?? null}
                    lipAllowMask={masks?.lipAllowMask ?? null} // ★ これを追加
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

                    {/* <div className={styles.toolRow}>
                        <label>ブラシ半径：</label>
                        <input
                            type="range"
                            min={4}
                            max={60}
                            value={brushRadius}
                            onChange={(e) => setBrushRadius(+e.target.value)}
                        />
                        <span>{brushRadius}px</span>
                    </div> */}

                    {/* 強さ：ステップごとに固定（スライダなし） */}
                    <div className={styles.toolRow}>
                        <label>強さ：</label>
                        <span>{Math.round(cfg.defaultStrength * 100)}%</span>
                    </div>

                    {/* ブラシ太さ：固定 or ボタン選択 */}
                    <div className={styles.toolRow}>
                        <label>ブラシ太さ：</label>

                        {/* allowedRadii が複数あるステップだけボタン表示 */}
                        {cfg.allowedRadii && cfg.allowedRadii.length > 1 ? (
                            <div className={styles.brushSizeButtons}>
                                {cfg.allowedRadii.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setBrushRadius(r)}
                                        aria-pressed={brushRadius === r}
                                    >
                                        {/* 人間向けラベル（大・中・小・極細） */}
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
                            // ★ デフォルト値しかないステップは「ゲージ固定（変更不可）」として表示
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
