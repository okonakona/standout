// src/app/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSim } from "@/utils/simStore";
import CosmeticsBlock from "@/components/CosmeticsBlock";
import cosmetics from "@/data/cosmetics.json";
import styles from "@/styles/editor.module.css";

type SimItem = { id: string; createdAt: number; dataUrl: string; note?: string };

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
    FINAL: "完成",
};

const categories = [
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

const genres = [
    { key: "brand", label: "ブランドもの" },
    { key: "affordable", label: "コスパ最強" },
    { key: "cool", label: "デザイン重視" },
    { key: "simple", label: "シンプル" },
];

export default function ResultPage() {
    // ★ 今回セッションのステップ別スナップショット（並び済み）
    const [latestSteps, setLatestSteps] = useState<SimItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("ground");

    useEffect(() => {
        (async () => {
            const all = await listSim();
            if (!all.length) {
                setLatestSteps([]);
                return;
            }

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

            // 3. 表示順に並べる：下地 → ... → リップ → FINAL
            const ordered: SimItem[] = [];

            for (const step of STEP_ORDER) {
                const it = latestByNote.get(step.id);
                if (it) ordered.push(it);
            }

            const finalItem = latestByNote.get("FINAL");
            if (finalItem) {
                ordered.push(finalItem);
            }

            setLatestSteps(ordered);
        })();
    }, []);

    return (
        <main style={{ padding: 24 }}>
            <h1>今回のメイク結果</h1>
            {/* ★ 各ステップごとの画像（今回分のみ & 並び順固定） */}
            {latestSteps.length === 0 ? (
                <p>まだメイク結果が保存されていません。</p>
            ) : (
                <div
                    style={{
                        maxWidth: 400,
                        display: "flex",
                        gap: 16,
                        marginBottom: 32,
                        overflowX: "scroll",
                        paddingBottom: 8,
                        scrollbarWidth: "none", // Firefox
                        msOverflowStyle: "none", // IE/Edge
                        WebkitOverflowScrolling: "touch", // スマホでのスムーズスクロール
                    }}
                >
                    {latestSteps.map((item) => {
                        const note = item.note ?? "";
                        const label = NOTE_LABEL[note] ?? (note || "STEP");

                        return (
                            <figure
                                key={item.id}
                                style={{
                                    minWidth: "100px",
                                    width: "100px",
                                    flexShrink: 0,
                                    margin: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                }}
                            >
                                <img
                                    src={item.dataUrl}
                                    alt={label}
                                    style={{
                                        width: "100%",
                                        height: "133px",
                                        borderRadius: 8,
                                        objectFit: "cover",
                                    }}
                                />
                                <figcaption
                                    style={{
                                        fontSize: 10,
                                        color: "#555",
                                        textAlign: "center",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {label}
                                </figcaption>
                            </figure>
                        );
                    })}
                </div>
            )}

            {/* ===== ここから下は既存のコスメおすすめエリア ===== */}
            <h2 style={{ marginBottom: 12 }}>おすすめコスメ</h2>

            <div
                style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 24,
                    overflowX: "auto",
                    maxWidth: 400,
                }}
            >
                {categories.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setSelectedCategory(t.key)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 6,
                            border: "1px solid #444",
                            background: selectedCategory === t.key ? "#000" : "#fff",
                            color: selectedCategory === t.key ? "#fff" : "#000",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <section>
                {genres.map((g) => {
                    const items = cosmetics.filter(
                        (v) => v.category === selectedCategory && v.genre === g.key
                    );
                    return <CosmeticsBlock key={g.key} title={g.label} items={items} />;
                })}
            </section>

            <div style={{ marginTop: 16 }}>
                <Link href="/editor">編集に戻る</Link>
            </div>
        </main>
    );
}
