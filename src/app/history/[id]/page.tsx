// src/app/history/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, SimSession } from "@/utils/simStore";
import MakeupSpecSheet from "@/components/result/MakeupSpecSheet";
import { Step } from "@/types/steps";
import styles from "./style.module.css";
import Link from "next/link";

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

export default function HistoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SimSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const sessionData = await getSession(sessionId);
                setSession(sessionData);
            } catch (error) {
                console.error("Failed to load session:", error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [sessionId]);

    const getLabelForNote = (note: string) => NOTE_LABEL[note] ?? (note || "STEP");

    if (isLoading) {
        return (
            <div className={styles.container}>
                <p className={styles.loading}>読み込み中...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>データが見つかりませんでした</p>
                <Link href="/" className={styles.backLink}>
                    トップへ戻る
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    ← 戻る
                </button>
                <h1>メイク仕様書</h1>
            </header>

            <main className={styles.content}>
                <div className={styles.resultWrap}>
                    {session.steps.map((step, index) => {
                        const label = getLabelForNote(step.note);
                        return (
                            <figure key={index} className={styles.stepFigure}>
                                <figcaption>{label}</figcaption>
                                <img src={step.dataUrl} alt={label} />
                            </figure>
                        );
                    })}
                </div>

                {session.settings && session.finalImage && (
                    <MakeupSpecSheet
                        steps={Object.keys(session.settings.colorByStep).map((s) => {
                            const stepData = session.steps.find((step) => step.note === s);
                            return {
                                step: s as Step,
                                label: getLabelForNote(s),
                                color: session.settings!.colorByStep[s as Step],
                                strength: session.settings!.strengthByStep[s as Step],
                                imageUrl: stepData?.dataUrl,
                            };
                        })}
                        finalImageUrl={session.finalImage}
                    />
                )}
            </main>
        </div>
    );
}
