// src/app/result/page.tsx
"use client";

import Link from "next/link";
import CosmeticsBlock from "@/components/CosmeticsBlock";
import cosmetics from "@/data/cosmetics.json";
import styles from "@/styles/editor.module.css";
import { useResultPage } from "@/components/result/useResultPage";
import MakeupSpecSheet from "@/components/result/MakeupSpecSheet";
import { Step } from "@/types/steps";

export default function ResultPage() {
    const {
        latestSteps,
        selectedCategory,
        setSelectedCategory,
        categories,
        genres,
        getLabelForNote,
        makeupSettings,
        finalImage,
    } = useResultPage();

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
                        const label = getLabelForNote(note);

                        return (
                            <figure
                                key={item.id}
                                style={{
                                    minWidth: "100px",
                                    width: "150px",
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

            {/* メイク仕様書 */}
            {makeupSettings && finalImage && (
                <MakeupSpecSheet
                    steps={Object.keys(makeupSettings.colorByStep).map((s) => {
                        const stepImage = latestSteps.find((item) => item.note === s);
                        return {
                            step: s as Step,
                            label: getLabelForNote(s),
                            color: makeupSettings.colorByStep[s as Step],
                            strength: makeupSettings.strengthByStep[s as Step],
                            imageUrl: stepImage?.dataUrl,
                        };
                    })}
                    finalImageUrl={finalImage}
                />
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
