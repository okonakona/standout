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

// === カラープリセット（JSON の型） ===
export type MakeupPreset = {
    id: string;
    label: string;
    hex: string; // sRGB hex (#rrggbb)
    p3: P3Color;
};

export type MakeupPresetMap = Record<Step, MakeupPreset[]>;

// JSON 読み込み（tsconfig の resolveJsonModule: true 前提）
import presetsJson from "@/data/makeupPresets.json";

// JSON 1件分の型（hex ベース）
type RawPreset = {
    id: string;
    label: string;
    hex: `#${string}`;
};

// hex → Display-P3(0..1) 変換
function hexToP3(hex: string): P3Color {
    const h = hex.replace("#", "");
    const r8 = parseInt(h.slice(0, 2), 16);
    const g8 = parseInt(h.slice(2, 4), 16);
    const b8 = parseInt(h.slice(4, 6), 16);

    return {
        space: "display-p3",
        r: r8 / 255,
        g: g8 / 255,
        b: b8 / 255,
    };
}

// JSON 全部に p3 を付与したマップ
export const MAKEUP_PRESETS: MakeupPresetMap = (() => {
    const map: Partial<MakeupPresetMap> = {};

    (Object.keys(presetsJson) as Step[]).forEach((step) => {
        const arr = (presetsJson as Record<string, RawPreset[]>)[step];
        map[step] = arr.map((p) => ({
            ...p,
            p3: hexToP3(p.hex),
        }));
    });

    return map as MakeupPresetMap;
})();

// === 各ステップの設定 ===
export type StepConfig = {
    label: string;
    blend: BlendKind;
    defaultStrength: number; // 0..1（塗りレイヤの不透明度）
    brush: BrushKind;
    defaultColor: string; // 基本色（hex）
    defaultRadius: number; // デフォルトのブラシ半径(px)
    allowedRadii?: number[]; // 選択肢があるステップだけ指定
    effectId: number; // WebGL 質感用の ID
    presets: MakeupPreset[]; // このステップで使える 12色プリセット
    defaultColorP3?: [number, number, number]; // 内部用 P3 (0..1)
};

// ここはブラシ仕様表（強さ・太さ）＋ 質感用 effectId を統合した設定
export const STEP_CONFIG: Record<Step, StepConfig> = {
    primer: {
        label: "下地",
        blend: "soft-light",
        defaultStrength: 0.15,
        brush: "cream",
        defaultColor: "#F7F5F2",
        defaultRadius: 45,
        // 下地は太さ固定（ゲージ固定）→ 大・中サイズのみ
        allowedRadii: [10, 7],
        effectId: 0, // Soft veil
        presets: MAKEUP_PRESETS.primer,
    },
    foundation: {
        label: "ファンデーション",
        blend: "multiply",
        defaultStrength: 0.15,
        brush: "cream",
        defaultColor: "#F3E7D8",
        defaultRadius: 40,
        // 10,7,4,1 あたりを大中小極細として用意
        allowedRadii: [10, 7, 4, 1],
        effectId: 1, // Liquid foundation
        presets: MAKEUP_PRESETS.foundation,
    },
    concealer: {
        label: "コンシーラー",
        blend: "normal",
        defaultStrength: 0.15,
        brush: "cream",
        defaultColor: "#FAE6D3",
        defaultRadius: 10,
        // コンシーラーは細かい作業用なので小・極小のみ
        allowedRadii: [4, 1],
        effectId: 2, // Concealer / matte
        presets: MAKEUP_PRESETS.concealer,
    },
    powder: {
        label: "パウダー",
        blend: "overlay",
        defaultStrength: 0.1,
        brush: "powder",
        defaultColor: "#FAF7F2",
        defaultRadius: 45,
        // パウダーは広範囲塗布なので大・中のみ
        allowedRadii: [10, 7],
        effectId: 3, // Powder / grain
        presets: MAKEUP_PRESETS.powder,
    },
    highlight: {
        label: "ハイライト",
        blend: "screen",
        defaultStrength: 0.15,
        brush: "soft",
        defaultColor: "#FFF8E8",
        defaultRadius: 30,
        // ハイライトは部分的なので中・小のみ
        allowedRadii: [7, 4],
        effectId: 4, // Highlight glow
        presets: MAKEUP_PRESETS.highlight,
    },
    cheek: {
        label: "チーク",
        blend: "screen",
        defaultStrength: 0.15,
        brush: "soft",
        defaultColor: "#FFD6D6",
        defaultRadius: 30,
        // チークは頬の範囲なので中・小のみ
        allowedRadii: [7, 4],
        // ハイライトと同じ質感（あとで別 effectId に分けたくなったら変更）
        effectId: 4,
        presets: MAKEUP_PRESETS.cheek,
    },
    contour: {
        label: "シェーディング",
        blend: "multiply",
        defaultStrength: 0.15,
        brush: "powder",
        defaultColor: "#C1B29E",
        defaultRadius: 30,
        // 大ブラシだけ追加（細かくやりたいときは 10px）
        allowedRadii: [30, 10],
        effectId: 5, // Contour / shadow
        presets: MAKEUP_PRESETS.contour,
    },
    brows: {
        label: "アイブロウ",
        blend: "multiply",
        defaultStrength: 0.2,
        brush: "powder",
        defaultColor: "#4A3A30",
        defaultRadius: 6,
        // アイブロウは細かい描写なので小・極小のみ
        allowedRadii: [4, 1],
        effectId: 6, // Brows / hair-like
        presets: MAKEUP_PRESETS.brows,
    },
    shadow: {
        label: "アイシャドウ",
        blend: "multiply",
        defaultStrength: 0.2,
        brush: "soft",
        defaultColor: "#CFC2B8",
        // 選択式（大・中・小・極細）
        defaultRadius: 7,
        allowedRadii: [10, 7, 4, 1],
        effectId: 7, // Eyeshadow
        presets: MAKEUP_PRESETS.shadow,
    },
    lips: {
        label: "リップ",
        blend: "overlay",
        defaultStrength: 0.35,
        brush: "gloss",
        defaultColor: "#F8D2D2",
        defaultRadius: 10,
        // リップは中・小サイズのみ（唇の範囲に応じて）
        allowedRadii: [7, 4],
        effectId: 8, // Lip gloss / shine
        presets: MAKEUP_PRESETS.lips,
    },
};
