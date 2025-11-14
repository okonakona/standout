// src/lib/guidePaths.ts
import { maskToSvgPath } from "@/lib/geometry";
import type { PartMasks } from "@/lib/faceLandmarks";
import type { Step } from "@/types/steps";

// ルール：ガイドはマスク境界から生成
// - lips: 唇マスクの輪郭
// - brows: 眉マスクの輪郭
// - shadow: 目窩の代替として目マスクの輪郭
// - 肌系（下地/ファンデ/コンシーラー/パウダー/シェーディング/ハイライト）は顔外周
export function guidePathForStep(step: Step, masks: PartMasks | null): string {
    // マスクがない場合（顔認識失敗時など）
    if (!masks) {
        return "";
    }

    const { lips, brows, eyes, skin } = masks;

    switch (step) {
        case "lips":
            return maskToSvgPath(lips);
        case "brows":
            return maskToSvgPath(brows);
        case "shadow":
            return maskToSvgPath(eyes);

        case "primer":
        case "foundation":
        case "concealer":
        case "powder":
        case "contour":
        case "highlight":
            return maskToSvgPath(skin);

        // 万一未対応のステップが来たら空文字
        default:
            return "";
    }
}
