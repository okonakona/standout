// src/components/history/HistoryButton.tsx
"use client";
import { useEffect, useState } from "react";
import { listSessions } from "@/utils/simStore";
import Link from "next/link";
import styles from "./HistoryButton.module.css";

export default function HistoryButton() {
    const [hasHistory, setHasHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const sessions = await listSessions();
                setHasHistory(sessions.length > 0);
            } catch (error) {
                console.error("Failed to check history:", error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    if (isLoading || !hasHistory) {
        return null;
    }

    return (
        <Link href="/mypage" className={styles.historyButton}>
            メイク履歴を見る
        </Link>
    );
}
