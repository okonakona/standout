import { useEffect, useState } from "react";
import { listSim, loadMakeupSettings, MakeupSettings } from "@/utils/simStore";

export type SimItem = { id: string; createdAt: number; dataUrl: string; note?: string };

// ステップの内部IDと日本語ラベル（並び順もここで定義）
const STEP_ORDER: { id: string; label: string }[] = [
    { id: "primer", label: "下地" },
    { id: "foundation", label: "ファンデーション" },
    { id: "concealer", label: "コンシーラー" },
    { id: "powder", label: "パウダー" },
    { id: "highlight", label: "ハイライト" },
    { id: "cheek", label: "チーク" },
    { id: "contour", label: "シェーディング" },
    { id: "brows", label: "アイブロウ" },
    { id: "shadow", label: "アイシャドウ" },
    { id: "lips", label: "リップ" },
];

// note → 表示ラベル（FINAL 含む）
const NOTE_LABEL: Record<string, string> = {
    FINAL: "完成",
    primer: "下地",
    foundation: "ファンデーション",
    concealer: "コンシーラー",
    powder: "パウダー",
    highlight: "ハイライト",
    cheek: "チーク",
    contour: "シェーディング",
    brows: "アイブロウ",
    shadow: "アイシャドウ",
    lips: "リップ",
};

export const categories = [
    { key: "ground", label: "下地" },
    { key: "foundation", label: "ファンデーション" },
    { key: "concealer", label: "コンシーラー" },
    { key: "powder", label: "パウダー" },
    { key: "highlight", label: "ハイライト" },
    { key: "cheek", label: "チーク" },
    { key: "shading", label: "シェーディング" },
    { key: "eyebrow", label: "アイブロウ" },
    { key: "eyeshadow", label: "アイシャドウ" },
    { key: "lip", label: "リップ" },
];

export const genres = [
    { key: "brand", label: "ブランドもの" },
    { key: "affordable", label: "コスパ最強" },
    { key: "cool", label: "デザイン重視" },
    { key: "simple", label: "シンプル" },
];

// 直近セッションの各ステップの最新スナップショットだけを並び替えて返す
function buildLatestSteps(all: SimItem[]): SimItem[] {
    if (!all.length) return [];

    // 1. 一番新しい FINAL を探す（all は新しい順に並んでいる想定）
    const finalIndex = all.findIndex((item) => item.note === "FINAL");

    let sessionItems: SimItem[] = [];

    if (finalIndex === -1) {
        // FINAL がまだない場合：とりあえず全件を「今回分」とする
        sessionItems = all;
    } else {
        // FINAL から、次の FINAL が出るまで（＝直近セッションぶん）を抜き出す
        for (let i = finalIndex; i < all.length; i++) {
            const it = all[i];
            if (i > finalIndex && it.note === "FINAL") {
                // ひとつ前のセッションの FINAL に当たったら終了
                break;
            }
            sessionItems.push(it);
        }
    }

    // 2. note ごとに「一番新しいもの」だけ残す
    //    sessionItems は [FINAL, lips, shadow, ...] のように
    //    新しい → 古い の順番なので、先に出てきたものを採用
    const latestByNote = new Map<string, SimItem>();
    for (const item of sessionItems) {
        const key = item.note;
        if (!key) continue;
        if (!latestByNote.has(key)) {
            latestByNote.set(key, item);
        }
    }

    // 3. 表示順に並べる：FINAL → 下地 → ... → リップ
    const ordered: SimItem[] = [];

    // 最初に完成画像（FINAL）を配置
    const finalItem = latestByNote.get("FINAL");
    if (finalItem) {
        ordered.push(finalItem);
    }

    // 続いてメイクステップの順序で配置
    for (const step of STEP_ORDER) {
        const it = latestByNote.get(step.id);
        if (it) ordered.push(it);
    }

    return ordered;
}

export function useResultPage() {
    // ★ 今回セッションのステップ別スナップショット（並び済み）
    const [latestSteps, setLatestSteps] = useState<SimItem[]>([]);
    const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
    const [makeupSettings, setMakeupSettings] = useState<MakeupSettings | null>(null);
    const [finalImage, setFinalImage] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const all = await listSim();
            const steps = buildLatestSteps(all);
            setLatestSteps(steps);

            // FINAL画像を取得
            const final = steps.find((item) => item.note === "FINAL");
            if (final) {
                setFinalImage(final.dataUrl);
            }

            // メイク設定を取得
            const settings = await loadMakeupSettings();
            setMakeupSettings(settings);
        })();
    }, []);

    const getLabelForNote = (note: string) => NOTE_LABEL[note] ?? (note || "STEP");

    return {
        latestSteps,
        selectedGenre,
        setSelectedGenre,
        categories,
        genres,
        getLabelForNote,
        makeupSettings,
        finalImage,
    };
}
