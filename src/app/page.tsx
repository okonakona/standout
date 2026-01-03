"use client";
import styles from './style.module.css'
import Footer from "@/components/footer/page";
import Header from "@/components/header/page";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
    return (
        <>
            <Header />
            <main>
                <div className={styles.imgWrap}>
                    <Image src="/assets/sample.png" alt="サンプル" width={390} height={241} />
                </div>
                <h1><Link href="/simulate">メイクシミュレーション</Link></h1>
                <h2>スタイルガイド</h2>
                <h2>イケメンメイクコラム</h2>
                <div className={styles.modalCnt}>
                </div>
            </main>
            <Footer />
        </>
    );
}
