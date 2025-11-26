// src/types/steps.ts

// Display-P3 を内部表現するための型
export type P3Color = {
    space: "display-p3";
    r: number; // 0..1
    g: number; // 0..1
    b: number; // 0..1
};

// メイクシミュレーションの各ステップを定義
export type Step =
    | "primer" // 下地
    | "foundation" // ファンデ(BB)
    | "concealer" // コンシーラー
    | "powder" // パウダー
    | "contour" // シェーディング
    | "highlight" // ハイライト
    | "cheek" // チーク
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
    effectId: number;
    defaultColorP3?: P3Color;
};

// ★ あなたの表をもとにした設定
export const STEP_CONFIG: Record<Step, StepConfig> = {
    primer: {
        label: "下地",
        blend: "soft-light",
        defaultStrength: 0.35,
        brush: "cream",
        defaultColor: "#f6eee8", // sRGB 近似
        defaultRadius: 45,
        effectId: 0,
        defaultColorP3: {
            space: "display-p3",
            r: 0.97,
            g: 0.94,
            b: 0.9,
        },
    },
    foundation: {
        label: "ファンデ(BB)",
        blend: "multiply",
        defaultStrength: 0.5,
        brush: "cream",
        defaultColor: "#e7c7a5",
        defaultRadius: 40,
        effectId: 1,
        defaultColorP3: {
            space: "display-p3",
            r: 0.9,
            g: 0.78,
            b: 0.64,
        },
    },
    concealer: {
        label: "コンシーラー",
        blend: "normal",
        defaultStrength: 0.75,
        brush: "cream",
        defaultColor: "#f2d7b6",
        defaultRadius: 10,
        effectId: 2,
        defaultColorP3: {
            space: "display-p3",
            r: 0.95,
            g: 0.83,
            b: 0.68,
        },
    },
    powder: {
        label: "パウダー",
        blend: "overlay",
        defaultStrength: 0.25,
        brush: "powder",
        defaultColor: "#f5e8db",
        defaultRadius: 45,
        effectId: 3,
        defaultColorP3: {
            space: "display-p3",
            r: 0.97,
            g: 0.92,
            b: 0.86,
        },
    },
    highlight: {
        label: "ハイライト",
        blend: "screen",
        defaultStrength: 0.15,
        brush: "soft",
        defaultColor: "#fbfbfbff",
        defaultRadius: 30,
        // ハイライトも基本固定（まずはこれで）
        effectId: 4,
        defaultColorP3: {
            space: "display-p3",
            r: 1.0,
            g: 0.95,
            b: 0.9,
        },
    },
    cheek: {
        label: "チーク",
        blend: "screen",
        defaultStrength: 0.15,
        brush: "soft",
        defaultColor: "#ffd7df",
        defaultRadius: 30,
        // ハイライトも基本固定（まずはこれで）
        effectId: 4,
        defaultColorP3: {
            space: "display-p3",
            r: 1.0,
            g: 0.72,
            b: 0.78,
        },
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
        effectId: 5,
        defaultColorP3: {
            space: "display-p3",
            r: 0.48,
            g: 0.38,
            b: 0.29,
        },
    },
    brows: {
        label: "アイブロウ",
        blend: "multiply",
        defaultStrength: 0.2,
        brush: "powder",
        defaultColor: "#3f352f",
        defaultRadius: 6,
        // アイブロウは固定（6px）
        effectId: 6,
        defaultColorP3: {
            space: "display-p3",
            r: 0.25,
            g: 0.21,
            b: 0.19,
        },
    },
    shadow: {
        label: "アイシャドウ",
        blend: "multiply",
        defaultStrength: 0.2,
        brush: "soft",
        defaultColor: "#6a6079",
        defaultRadius: 7, // 中ブラシをデフォに
        allowedRadii: [10, 7, 4, 1], // 大 / 中 / 小 / 極細
        effectId: 7,
        defaultColorP3: {
            space: "display-p3",
            r: 0.41,
            g: 0.38,
            b: 0.47,
        },
    },
    lips: {
        label: "リップ",
        blend: "overlay",
        defaultStrength: 0.35,
        brush: "gloss",
        defaultColor: "#c84a58",
        defaultRadius: 10,
        // リップは範囲マスク＋10px 固定
        effectId: 8,
        defaultColorP3: {
            space: "display-p3",
            r: 0.86,
            g: 0.36,
            b: 0.4,
        },
    },
};
