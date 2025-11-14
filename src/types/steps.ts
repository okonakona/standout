// メイクシミュレーションの各ステップを定義
export type Step =
    | "primer" // 下地
    | "foundation" // ファンデ(BB)
    | "concealer" // コンシーラー
    | "powder" // パウダー
    | "contour" // シェーディング
    | "highlight" // ハイライト（チークはここでOK）
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
};

// した時の色デフォルトを白からベージュに変える
export const STEP_CONFIG: Record<Step, StepConfig> = {
    primer: {
        label: "下地",
        blend: "soft-light",
        defaultStrength: 0.35,
        brush: "cream",
        defaultColor: "#ffffff",
    },
    foundation: {
        label: "ファンデ(BB)",
        blend: "multiply",
        defaultStrength: 0.5,
        brush: "cream",
        defaultColor: "#e7c7a5",
    },
    concealer: {
        label: "コンシーラー",
        blend: "normal",
        defaultStrength: 0.75,
        brush: "cream",
        defaultColor: "#f2d7b6",
    },
    powder: {
        label: "パウダー",
        blend: "overlay",
        defaultStrength: 0.25,
        brush: "powder",
        defaultColor: "#f5e8db",
    },
    contour: {
        label: "シェーディング",
        blend: "multiply",
        defaultStrength: 0.3,
        brush: "powder",
        defaultColor: "#7a5b3b",
    },
    highlight: {
        label: "ハイライト/チーク",
        blend: "screen",
        defaultStrength: 0.35,
        brush: "soft",
        defaultColor: "#ffd7df",
    },
    brows: {
        label: "アイブロウ",
        blend: "multiply",
        defaultStrength: 0.65,
        brush: "powder",
        defaultColor: "#3f352f",
    },
    shadow: {
        label: "アイシャドウ",
        blend: "multiply",
        defaultStrength: 0.45,
        brush: "soft",
        defaultColor: "#6a6079",
    },
    lips: {
        label: "リップ",
        blend: "overlay",
        defaultStrength: 0.55,
        brush: "gloss",
        defaultColor: "#c84a58",
    },
};
