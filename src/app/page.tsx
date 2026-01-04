"use client";
import styles from './style.module.css'
import Footer from "@/components/footer/page";
import Header from "@/components/header/page";
import Image from "next/image";
import Link from "next/link";
import SimulatePage from './simulate/page';

export default function Home() {
    return (
        <>
            <Header />
            <main>
                <div className={styles.content}>
                    <h1 className={styles.imgWrap}>
                        <Image src="/assets/sample.png" alt="サンプル" width={390} height={241} />
                    </h1>
                    <button className={styles.button}>メイクシミュレーション</button>
                    <section>
                        <h2>スタイルガイド</h2>
                        <div className={styles.guidWrap}>
                            {/* <Link href="/">
                                <Image src="/assets/sample.png" alt="サンプル" width={390} height={241} />
                                <p>綺麗系</p>
                            </Link> */}
                        </div>
                    </section>
                    <section>
                        <h2>イケメンメイクコラム</h2>
                        <div className={styles.articleWrap}>
                        </div>
                    </section>
                </div>
                <div className={styles.modalCnt}>
                </div>
                <SimulatePage />
            </main>
            <Footer />
        </>
    );
}
