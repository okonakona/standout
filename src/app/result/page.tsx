// src/app/result/page.tsx
"use client";
import styles from './style.module.css'
import Link from "next/link";
import CosmeticsBlock from "@/components/CosmeticsBlock";
import cosmetics from "@/data/cosmetics.json";
import { useResultPage } from "@/components/result/useResultPage";
import MakeupSpecSheet from "@/components/result/MakeupSpecSheet";
import { Step } from "@/types/steps";

export default function ResultPage() {
    const {
        latestSteps,
        selectedGenre,
        setSelectedGenre,
        categories,
        genres,
        getLabelForNote,
        makeupSettings,
        finalImage,
    } = useResultPage();
    
    return (
        <main>
            <div className={styles.content}>
                <h1>今回のメイク結果</h1>
                {/* ★ 各ステップごとの画像（今回分のみ & 並び順固定） */}
                {latestSteps.length === 0 ? (
                    <p>まだメイク結果が保存されていません。</p>
                ) : (
                    <div className={styles.resultWrap}>
                        {latestSteps.map((item) => {
                            const note = item.note ?? "";
                            const label = getLabelForNote(note);
                            return (
                                <figure>
                                    <img
                                        src={item.dataUrl}
                                        alt={label}/>
                                    <figcaption>
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
                <h2>おすすめコスメ</h2>
                <div>
                <button
                    onClick={() => setSelectedGenre("ALL")}
                >
                    すべて
                </button>
                {genres.map((g) => (
                    <button
                        key={g.key}
                        onClick={() => setSelectedGenre(g.key)}
                    >
                        {g.label}
                    </button>
                ))}
                </div>
                <section>
                {categories.map((c) => {
                    const items = cosmetics.filter(
                        (v) =>
                        (selectedGenre === "ALL" || v.genre === selectedGenre) &&
                        v.category === c.key
                    );
                    if (items.length === 0) return null;

                    return (
                        <CosmeticsBlock
                        key={c.key}
                        title={c.label}
                        items={items}
                        />
                    );
                })}
                </section>
                <div>
                    <Link href="/editor">編集に戻る</Link>
                </div>
            </div>
        </main>
    );
}
