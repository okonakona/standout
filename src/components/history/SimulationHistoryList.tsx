// src/components/history/SimulationHistoryList.tsx
"use client";
import { useEffect, useState } from "react";
import { listSessions, SimSession, removeDuplicateSessions } from "@/utils/simStore";
import styles from "./SimulationHistoryList.module.css";
import Link from "next/link";

export default function SimulationHistoryList() {
    const [sessions, setSessions] = useState<SimSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                // まず重複を削除
                const removedCount = await removeDuplicateSessions();
                if (removedCount > 0) {
                    console.log(`${removedCount}件の重複セッションを削除しました`);
                }

                // セッション一覧を取得
                const sessionList = await listSessions();
                console.log("取得したセッション数:", sessionList.length);

                setSessions(sessionList);
            } catch (error) {
                console.error("Failed to load simulation history:", error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    if (isLoading) {
        return (
            <section className={styles.historySection}>
                <h2>メイク履歴</h2>
                <p className={styles.loading}>読み込み中...</p>
            </section>
        );
    }

    if (sessions.length === 0) {
        return (
            <section className={styles.historySection}>
                <h2>メイク履歴</h2>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📸</div>
                    <p className={styles.emptyTitle}>まだメイク履歴がありません</p>
                    <p className={styles.emptyDescription}>
                        「メイクシミュレーション」ボタンから
                        <br />
                        メイクを試してみましょう！
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.historySection}>
            <h2>メイク履歴</h2>
            <div className={styles.historyGrid}>
                {sessions.map((session) => (
                    <Link
                        key={session.id}
                        href={`/history/${session.id}`}
                        className={styles.historyCard}
                    >
                        <div className={styles.imageWrapper}>
                            <img
                                src={session.finalImage}
                                alt="メイク結果"
                                className={styles.thumbnail}
                            />
                        </div>
                        <div className={styles.cardInfo}>
                            <p className={styles.date}>
                                {new Date(session.createdAt).toLocaleDateString("ja-JP", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                            <p className={styles.stepCount}>{session.steps.length}ステップ</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
