// src/app/editor/page.tsx
"use client";
import PracticeCanvas from "@/components/editor/PracticeCanvas";
import { WebglMakeupCanvas } from "@/components/webgl/WebglMakeupCanvas";
import styles from "@/styles/editor.module.css";
import { useEditorPage } from "@/components/editor/useEditorPage";
import NavigationLayout from "@/components/navigation/NavigationLayout";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { STEP_CONFIG } from "@/types/steps";
import {
    ColorPointSvg,
    LipPointSvg,
    BrushSvg,
    ColorIcon,
    BlurIcon,
    ResetIcon,
} from "@/components/svg/Icons";

export default function EditorPage() {
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [selectedBrush, setSelectedBrush] = useState<number>(1); // ブラシタイプを管理
    const router = useRouter();
    const currentStepRef = useRef<HTMLDivElement>(null);

    const {
        img,
        loading,
        error,
        order,
        step,
        cfg,
        brushRadius,
        mode,
        colorByStep,
        strengthByStep,
        guide,
        masks,
        compositeCanvas,
        activeMask,
        maskByStep,
        isFirst,
        isLast,
        currentColor,
        currentStrength,
        setMode,
        setBrushRadius,
        setColorByStep,
        setCompositeCanvas,
        setMaskByStep,
        goPrevStep,
        goNextStep,
        handleFinish,
    } = useEditorPage();

    // 現在のステップが変更されたときに自動スクロール
    useEffect(() => {
        if (currentStepRef.current) {
            currentStepRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        }
    }, [step]);

    // ステップが変更されたら描画モードをpaintに戻す
    useEffect(() => {
        setMode("paint");
        setSelectedTool(null);
    }, [step, setMode]);

    if (!img) return null;

    return (
        <div className={styles.fullScreenContainer}>
            {/* メイン画像エリア */}
            <section className={styles.imageSection}>
                {loading && <p className={styles.loadingText}>シミュレーション中</p>}
                {/* {error && <p style={{ color: "crimson" }}>解析エラー: {error}</p>} */}

                <div className={styles.canvasContainer}>
                    {/* 下：2D 編集＆合成 */}
                    <PracticeCanvas
                        image={img}
                        activeStep={step}
                        order={order}
                        colorByStep={colorByStep}
                        strengthByStep={strengthByStep}
                        brushRadius={brushRadius}
                        mode={mode}
                        faceClipMask={masks?.faceClipMask ?? null}
                        lipAllowMask={masks?.lipAllowMask ?? null}
                        guidePathD={guide.d}
                        guideBandPx={guide.bandPx}
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

                {/* ナビゲーションオーバーレイ */}
                <div className={styles.navigationOverlay}>
                    <NavigationLayout
                        activeId={selectedTool}
                        onItemClickAction={(id) => {
                            setSelectedTool(id);
                            if (id === "blur") {
                                setBrushRadius(15);
                                setMode("blur");
                            }
                        }}
                        onBackClick={() => {
                            if (selectedTool) {
                                // ツール選択時は選択を解除
                                setSelectedTool(null);
                            } else {
                                // 未選択時はステップを戻る
                                if (!isFirst) {
                                    goPrevStep();
                                } else {
                                    // 最初のステップの場合は前のページに戻る
                                    router.back();
                                }
                            }
                        }}
                        onOkClick={() => {
                            if (selectedTool) {
                                // ツール選択時の確認処理
                                console.log("ツール確定:", selectedTool);
                                setSelectedTool(null);
                            } else {
                                // 未選択時のOK処理（ステップ進行など）
                                if (!isLast) {
                                    goNextStep();
                                } else {
                                    handleFinish();
                                }
                            }
                        }}
                    >
                        {/* 未選択時：メイクステップ表示 */}
                        {!selectedTool && (
                            <div className={styles.partsTool}>
                                <h3 className={styles.navTitle}>現在のステップ</h3>
                                <div className={styles.stepsList}>
                                    {order.map((s, index) => {
                                        const stepConfig = STEP_CONFIG[s];
                                        const isCurrent = s === step;
                                        const isPast = order.indexOf(s) < order.indexOf(step);
                                        const hasMask = !!maskByStep[s];

                                        return (
                                            <div
                                                key={s}
                                                ref={isCurrent ? currentStepRef : null}
                                                className={`${styles.stepItem} ${
                                                    isCurrent ? styles.current : ""
                                                } ${isPast ? styles.past : ""} ${
                                                    hasMask ? styles.completed : ""
                                                }`}
                                            >
                                                <div className={styles.stepImageFrame}>
                                                    {/* 画像表示エリア */}
                                                </div>
                                                <div className={styles.stepInfo}>
                                                    <div className={styles.stepNumber}>
                                                        {index + 1}
                                                    </div>
                                                    <div className={styles.stepLabel}>
                                                        {stepConfig.label}
                                                    </div>
                                                    <div className={styles.stepStatus}>
                                                        {isCurrent && (
                                                            <span className={styles.statusBadge}>
                                                                編集中
                                                            </span>
                                                        )}
                                                        {!isCurrent && isPast && hasMask && (
                                                            <span
                                                                className={`${styles.statusBadge} ${styles.completed}`}
                                                            >
                                                                完了
                                                            </span>
                                                        )}
                                                        {!isCurrent && !isPast && (
                                                            <span
                                                                className={`${styles.statusBadge} ${styles.upcoming}`}
                                                            >
                                                                未開始
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 選択時：ツール固有のUI */}
                        {selectedTool && (
                            <div className={styles.toolContent}>
                                {selectedTool === "parts" && (
                                    <div className={styles.partsTool}>
                                        <h3 className={styles.navTitle}>重ね塗り</h3>
                                        <div className={styles.stepsList}>
                                            {order
                                                .filter((s) => !!maskByStep[s])
                                                .map((s, index) => {
                                                    const stepConfig = STEP_CONFIG[s];
                                                    const isCurrent = s === step;
                                                    const color = colorByStep[s] || stepConfig.defaultColor;

                                                    return (
                                                        <div
                                                            key={s}
                                                            className={`${styles.stepItem} ${
                                                                isCurrent ? styles.current : ""
                                                            } ${styles.completed}`}
                                                        >
                                                            <div
                                                                className={styles.stepImageFrame}
                                                                style={{
                                                                    backgroundColor: color,
                                                                    opacity: 0.7,
                                                                }}
                                                            >
                                                                {/* 塗りの色を背景色として表示 */}
                                                            </div>
                                                            <div className={styles.stepInfo}>
                                                                <div className={styles.stepNumber}>
                                                                    {order.indexOf(s) + 1}
                                                                </div>
                                                                <div className={styles.stepLabel}>
                                                                    {stepConfig.label}
                                                                </div>
                                                                <div className={styles.stepStatus}>
                                                                    <span
                                                                        className={`${styles.statusBadge} ${styles.completed}`}
                                                                    >
                                                                        塗り済み
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            {order.filter((s) => !!maskByStep[s]).length === 0 && (
                                                <div
                                                    style={{
                                                        padding: "20px",
                                                        textAlign: "center",
                                                        color: "#999",
                                                    }}
                                                >
                                                    まだ塗りがありません
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {selectedTool === "color" && (
                                    <div className={styles.colorTool}>
                                        <h3 className={styles.navTitle}>好きな色を選んでみよう</h3>
                                        <div className={styles.colorPresets}>
                                            <div className={styles.customColorSection}>
                                                <button
                                                    className={styles.customColorButton}
                                                    onClick={() =>
                                                        document
                                                            .getElementById("colorInput")
                                                            ?.click()
                                                    }
                                                >
                                                    <div className={styles.customColorIcon}>
                                                        <ColorIcon />
                                                        <span className={styles.customColorLabel}>
                                                            カスタム
                                                        </span>
                                                    </div>
                                                    <input
                                                        id="colorInput"
                                                        type="color"
                                                        value={currentColor}
                                                        onChange={(e) =>
                                                            setColorByStep((prev) => ({
                                                                ...prev,
                                                                [step]: e.target.value,
                                                            }))
                                                        }
                                                        style={{ display: "none" }}
                                                    />
                                                </button>
                                            </div>
                                            {cfg.presets.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    className={`${styles.colorOption} ${
                                                        currentColor === preset.hex
                                                            ? styles.active
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        setColorByStep((prev) => ({
                                                            ...prev,
                                                            [step]: preset.hex,
                                                        }))
                                                    }
                                                    title={preset.label}
                                                >
                                                    {step === "lips" ? (
                                                        <LipPointSvg
                                                            fillColor={preset.hex}
                                                            strokeColor="#454A53"
                                                            width={24}
                                                            height={36}
                                                            className={`${styles.presetSvg} ${styles.svgIcon}`}
                                                        />
                                                    ) : (
                                                        <ColorPointSvg
                                                            fillColor={preset.hex}
                                                            strokeColor="#454A53"
                                                            width={40}
                                                            height={48}
                                                            className={`${styles.presetSvg} ${styles.svgIcon}`}
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedTool === "blur" && (
                                    <div className={styles.brushTool}>
                                        <h3 className={styles.navTitle}>
                                            色が強くなったところをぼかそう
                                        </h3>
                                        <div
                                            className={`${styles.blurOption} ${
                                                mode === "blur" ? styles.active : ""
                                            }`}
                                            onClick={() =>
                                                setMode(mode === "blur" ? "paint" : "blur")
                                            }
                                        >
                                            <BlurIcon className={styles.blurIconLarge} />
                                        </div>
                                    </div>
                                )}
                                {selectedTool === "brush" &&
                                    (() => {
                                        // 現在のステップで利用可能なブラシサイズを取得
                                        const stepConfig = STEP_CONFIG[step];
                                        const allowedRadii = stepConfig.allowedRadii || [
                                            stepConfig.defaultRadius,
                                        ];

                                        // ブラシサイズに対応するブラシタイプを決定
                                        // [1, 4, 7, 10] → [極小, 小, 中, 大]
                                        const getBrushTypeFromRadius = (radius: number): number => {
                                            if (radius <= 1) return 1; // 極小
                                            if (radius <= 4) return 2; // 小
                                            if (radius <= 7) return 3; // 中
                                            return 4; // 大
                                        };

                                        // 利用可能なブラシタイプを計算
                                        const availableBrushTypes = allowedRadii.map(
                                            (radius: number) => ({
                                                type: getBrushTypeFromRadius(radius),
                                                radius: radius,
                                            })
                                        );
                                        // ブラシタイプ順でソート（1、2、3、4の順番を保証）
                                        availableBrushTypes.sort((a, b) => a.type - b.type);

                                        return (
                                            <div className={styles.brushTool}>
                                                <h3 className={styles.navTitle}>
                                                    塗る大きさを変えてみよう
                                                </h3>
                                                <div className={styles.brushOptions}>
                                                    {availableBrushTypes.map(
                                                        ({
                                                            type,
                                                            radius,
                                                        }: {
                                                            type: number;
                                                            radius: number;
                                                        }) => (
                                                            <div
                                                                key={radius}
                                                                data-brush-type={type}
                                                                className={`${styles.brushOption} ${
                                                                    selectedBrush === type
                                                                        ? styles.active
                                                                        : ""
                                                                }`}
                                                                onClick={() => {
                                                                    setSelectedBrush(type);
                                                                    setBrushRadius(radius);
                                                                    setMode("paint");
                                                                }}
                                                            >
                                                                <BrushSvg
                                                                    type={type}
                                                                    className={styles.brushSvg}
                                                                />
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                {(selectedTool === "eraser" || selectedTool === "eraser2") && (
                                    <div className={styles.brushTool}>
                                        <h3 className={styles.navTitle}>
                                            塗りの修正したいところを修正しよう
                                        </h3>
                                        <div
                                            className={`${styles.blurOption} ${
                                                mode === "erase" ? styles.active : ""
                                            }`}
                                            onClick={() =>
                                                setMode(mode === "erase" ? "paint" : "erase")
                                            }
                                        >
                                            <ResetIcon className={styles.blurIconLarge} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </NavigationLayout>
                </div>
            </section>
        </div>
    );
}
