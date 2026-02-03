// src/app/mypage/page.tsx
"use client";
import Header from "@/components/header/page";
import Footer from "@/components/footer/page";
import SimulationHistoryList from "@/components/history/SimulationHistoryList";
import styles from "./style.module.css";

export default function MyPage() {
    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.content}>
                    <h1 className={styles.pageTitle}>マイページ</h1>
                    <SimulationHistoryList />
                </div>
            </main>
            <Footer />
        </>
    );
}
