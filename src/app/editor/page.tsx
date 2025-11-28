// src/app/editor/page.tsx
"use client";
import PracticeCanvas from "@/components/editor/PracticeCanvas";
import { WebglMakeupCanvas } from "@/components/webgl/WebglMakeupCanvas";
import styles from "@/styles/editor.module.css";
import { useEditorPage } from "@/components/editor/useEditorPage";
import NavigationLayout from "@/components/navigation/NavigationLayout";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STEP_CONFIG } from "@/types/steps";
import { ColorPointSvg, LipPointSvg } from "@/components/svg";

export default function EditorPage() {
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [selectedBrush, setSelectedBrush] = useState<number>(1); // ブラシタイプを管理
    const router = useRouter();

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
                        onItemClickAction={(id) => setSelectedTool(id)}
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
                            <div className={styles.stepsContainer}>
                                <div className={styles.stepsRow}>
                                    <div className={styles.stepInfo}>
                                        <h3>{cfg.label}</h3>
                                        <p>ツールを選択してメイクを開始してください</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 選択時：ツール固有のUI */}
                        {selectedTool && (
                            <div className={styles.toolContent}>
                                {selectedTool === "color" && (
                                    <div className={styles.colorTool}>
                                        {/* ステップに応じたSVGアイコンを表示 */}
                                        <div className={styles.colorToolHeader}>
                                            <div className={styles.stepIconDisplay}>
                                                {step === "lips" ? (
                                                    <LipPointSvg
                                                        fillColor={currentColor}
                                                        strokeColor="#454A53"
                                                        width={32}
                                                        height={48}
                                                        style={{ display: "block" }}
                                                    />
                                                ) : (
                                                    <ColorPointSvg
                                                        fillColor={currentColor}
                                                        strokeColor="#454A53"
                                                        width={36}
                                                        height={40}
                                                        style={{ display: "block" }}
                                                    />
                                                )}
                                                {/* <div
                                                    style={{
                                                        fontSize: "10px",
                                                        color: "#666",
                                                        marginTop: "2px",
                                                    }}
                                                >
                                                    {step}
                                                </div> */}
                                            </div>
                                            <div className={styles.stepColorInfo}>
                                                <span className={styles.stepName}>{cfg.label}</span>
                                                <span className={styles.currentColorCode}>
                                                    {currentColor.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* <h3>カラー選択</h3> */}
                                        <div className={styles.colorPresets}>
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
                                                            width={28}
                                                            height={30}
                                                            className={`${styles.presetSvg} ${styles.svgIcon}`}
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={styles.customColorSection}>
                                            <div className={styles.customColorLabel}>
                                                カスタムカラー
                                            </div>
                                            <div className={styles.customColorPicker}>
                                                <div className={styles.customColorPreview}>
                                                    {step === "lips" ? (
                                                        <LipPointSvg
                                                            fillColor={currentColor}
                                                            strokeColor="#454A53"
                                                            width={30}
                                                            height={36}
                                                            className={styles.svgIcon}
                                                        />
                                                    ) : step === "cheek" ||
                                                      step === "shadow" ||
                                                      step === "brows" ? (
                                                        <ColorPointSvg
                                                            fillColor={currentColor}
                                                            strokeColor="#454A53"
                                                            width={30}
                                                            height={32}
                                                            className={styles.svgIcon}
                                                        />
                                                    ) : (
                                                        <div
                                                            className={styles.customColorCircle}
                                                            style={{
                                                                backgroundColor: currentColor,
                                                            }}
                                                        />
                                                    )}
                                                </div>
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
                                                <span className={styles.customColorHex}>
                                                    {currentColor.toUpperCase()}
                                                </span>
                                            </div>
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
                                                                key={type}
                                                                data-brush-type={type}
                                                                className={`${styles.brushOption} ${
                                                                    selectedBrush === type
                                                                        ? styles.active
                                                                        : ""
                                                                }`}
                                                                onClick={() => {
                                                                    setSelectedBrush(type);
                                                                    setBrushRadius(radius);
                                                                }}
                                                            >
                                                                <img
                                                                    src={`/assets/brush/brush${type}.svg`}
                                                                    alt={`ブラシ ${type}`}
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
                                    <div className={styles.eraserTool}>
                                        <h3>消しゴム</h3>
                                        <button
                                            className={`${styles.modeButton} ${
                                                mode === "erase" ? styles.active : ""
                                            }`}
                                            onClick={() => setMode("erase")}
                                        >
                                            消しゴムモード
                                        </button>
                                    </div>
                                )}

                                {selectedTool === "parts" && (
                                    <div className={styles.partsTool}>
                                        <h3>レイヤー表示</h3>
                                        <p>レイヤー管理機能</p>
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
