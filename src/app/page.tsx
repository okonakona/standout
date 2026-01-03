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
                <h1>メンズメイク・トレーニング</h1>
                <p>はじめにやりたいことを選んでください。</p>
                <div>
                    <Link
                        href="/role"
                        
                    >
                        ロールモデル選択（作成）
                    </Link>
                    <Link
                        href="/simulate"
                        
                    >
                        シミュレーション
                    </Link>
                </div>
            </main>
            <Footer />
        </>
    );
}
