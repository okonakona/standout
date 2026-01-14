// src/app/result/page.tsx
"use client";
import styles from "./style.module.css";
import Link from "next/link";
import CosmeticsBlock from "@/components/cosmeticsBlock/page";
import cosmetics from "@/data/cosmetics.json";
import { useResultPage } from "@/components/result/useResultPage";
import MakeupSpecSheet from "@/components/result/MakeupSpecSheet";
import { Step } from "@/types/steps";
import Footer from "@/components/footer/page";

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
        <div className={styles.resultPage}>
            <main>
                <div className={styles.content}>
                    <h1>結果</h1>
                    {/* ★ 各ステップごとの画像（今回分のみ & 並び順固定） */}
                    <div className={styles.s}>
                        {latestSteps.length === 0 ? (
                            <p>まだメイク結果が保存されていません。</p>
                        ) : (
                            <div className={styles.resultWrap}>
                                {latestSteps.map((item: any, index: number) => {
                                    const note = item.note ?? "";
                                    const label = getLabelForNote(note);
                                    return (
                                        <figure key={index}>
                                            <figcaption>{label}</figcaption>
                                            <img src={item.dataUrl} alt={label} />
                                        </figure>
                                    );
                                })}
                            </div>
                        )}
                        {/* メイク仕様書 */}
                        {makeupSettings && finalImage && (
                            <MakeupSpecSheet
                                steps={Object.keys(makeupSettings.colorByStep).map((s) => {
                                    const stepImage = latestSteps.find(
                                        (item: any) => item.note === s
                                    );
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
                    </div>
                    <div className={styles.cosmeticsWrap}>
                        {/* ジャンル選択 */}
                        <div className={styles.selectScroll}>
                            <div className={styles.selectInner}>
                                <button
                                    className={`${styles.genreButton} ${
                                        selectedGenre === "ALL" ? styles.active : ""
                                    }`}
                                    onClick={() => setSelectedGenre("ALL")}
                                >
                                    すべての推奨コスメ
                                </button>
                                {genres.map((g: any) => (
                                    <button
                                        key={g.key}
                                        className={`${styles.genreButton} ${
                                            selectedGenre === g.key ? styles.active : ""
                                        }`}
                                        onClick={() => setSelectedGenre(g.key)}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* コスメ一覧 */}
                        <section>
                            {categories.map((c: any) => {
                                const items = cosmetics.filter(
                                    (v) =>
                                        (selectedGenre === "ALL" || v.genre === selectedGenre) &&
                                        v.category === c.key
                                );
                                if (items.length === 0) return null;
                                return <CosmeticsBlock key={c.key} title={c.label} items={items} />;
                            })}
                        </section>
                    </div>
                    <div>
                        <Link href="/editor">編集に戻る</Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
