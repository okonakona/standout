// src/types/steps.ts

// メイクシミュレーションの各ステップを定義
export type Step =
    | "primer" // 下地
    | "foundation" // ファンデ(BB)
    | "concealer" // コンシーラー
    | "powder" // パウダー
    | "contour" // シェーディング
    | "highlight" // ハイライト（チーク含む）
    | "brows" // アイブロウ
    | "shadow" // アイシャドウ
    | "lips"; // リップ

export type BlendKind = "multiply" | "screen" | "overlay" | "soft-light" | "normal";
export type BrushKind = "soft" | "powder" | "cream" | "gloss";

export type StepConfig = {
    label: string;
    blend: BlendKind;
    defaultStrength: number; // 0..1
    brush: BrushKind;
    defaultColor: string;
    defaultRadius: number; // デフォルトのブラシ半径(px)
    allowedRadii?: number[]; // 選択肢がある場合のみ定義（なければ完全固定）
};

// ★ あなたの表をもとにした設定
export const STEP_CONFIG: Record<Step, StepConfig> = {
    primer: {
        label: "下地",
        blend: "soft-light",
        defaultStrength: 0.15,
        brush: "cream",
        // 下地はほぼ透明なトーンアップ系を想定して少しベージュ寄りでもOK
        defaultColor: "#f5eadf",
        defaultRadius: 45,
        // 下地は太さいじらせない → allowedRadii なし
    },
    foundation: {
        label: "ファンデ(BB)",
        blend: "multiply",
        defaultStrength: 0.15,
        brush: "cream",
        defaultColor: "#e7c7a5",
        defaultRadius: 40,
        // 40px を基準 + 細かい作業用ブラシ
        allowedRadii: [40, 10, 7, 4, 1], // 大 / 中 / 小 / 極細
    },
    concealer: {
        label: "コンシーラー",
        blend: "normal",
        defaultStrength: 0.15,
        brush: "cream",
        defaultColor: "#f2d7b6",
        defaultRadius: 10,
        // コンシーラーも基本は固定太さ
    },
    powder: {
        label: "パウダー",
        blend: "overlay",
        defaultStrength: 0.1,
        brush: "powder",
        defaultColor: "#f5e8db",
        defaultRadius: 45,
        // パウダーは全顔にふわっと → 固定
    },
    highlight: {
        label: "ハイライト / チーク",
        blend: "screen",
        defaultStrength: 0.15,
        brush: "soft",
        defaultColor: "#ffd7df",
        defaultRadius: 30,
        // ハイライトも基本固定（まずはこれで）
    },
    contour: {
        label: "シェーディング",
        blend: "multiply",
        defaultStrength: 0.15,
        brush: "powder",
        defaultColor: "#7a5b3b",
        defaultRadius: 30,
        // 30 をベースに、より広く入れたいとき用に 10px だけ選択肢
        allowedRadii: [30, 10],
    },
    brows: {
        label: "アイブロウ",
        blend: "multiply",
        defaultStrength: 0.2,
        brush: "powder",
        defaultColor: "#3f352f",
        defaultRadius: 6,
        // アイブロウは固定（6px）
    },
    shadow: {
        label: "アイシャドウ",
        blend: "multiply",
        defaultStrength: 0.2,
        brush: "soft",
        defaultColor: "#6a6079",
        defaultRadius: 7, // 中ブラシをデフォに
        allowedRadii: [10, 7, 4, 1], // 大 / 中 / 小 / 極細
    },
    lips: {
        label: "リップ",
        blend: "overlay",
        defaultStrength: 0.35,
        brush: "gloss",
        defaultColor: "#c84a58",
        defaultRadius: 10,
        // リップは範囲マスク＋10px 固定
    },
};
