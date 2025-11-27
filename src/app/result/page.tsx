// src/app/result/page.tsx
"use client";
import { useEffect, useState } from "react";
import { listSim } from "@/utils/simStore";
import Link from "next/link";
import CosmeticsBlock from "@/components/CosmeticsBlock";
import cosmetics from "@/data/cosmetics.json";

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
        { key: "lip", label: "リップ" }
    ];
    
    const genres = [
        { key: "brand", label: "ブランドもの" },
        { key: "affordable", label: "コスパ最強" },
        { key: "cool", label: "デザイン重視" },
        { key: "simple", label: "シンプル" },
    ];

export default function ResultPage() {
    const [selectedCategory, setSelectedCategory] = useState("ground");
    return (
        <main style={{ padding: 24 }}>
            <h1>保存した結果</h1>
            <div style={{ display: "flex", gap: 12, marginBottom: 24, overflow: "scroll", width: 400 }}>
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
                    }}
                >
                    {t.label}
                </button>
                ))}
            </div>

            {/* 選択されたタイプだけ表示する */}
            <section>
                {genres.map((g) => {
                const items = cosmetics.filter(
                    (v) => v.category === selectedCategory && v.genre === g.key
                );

                return (
                    <CosmeticsBlock
                    key={g.key}
                    title={g.label}
                    items={items}
                    />
                );
                })}
            </section>
            <div style={{ marginTop: 16 }}>
                <Link href="/editor">編集に戻る</Link>
            </div>
        </main>
    );
}
