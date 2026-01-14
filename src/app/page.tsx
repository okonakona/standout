"use client";
import styles from './style.module.css'
import Footer from "@/components/footer/page";
import Header from "@/components/header/page";
import Image from "next/image";
import Link from "next/link";
import SimulatePage from './simulate/page';
import { useState } from 'react';

export default function Home() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <Header />
            <main>
                <div className={styles.content}>
                    <h1 className={styles.imgWrap}>
                        <Image src="/assets/homeHead.jpg" alt="サンプル" width={390} height={219} />
                    </h1>
                    <button 
                    className={styles.button} 
                    onClick={() => setIsOpen(true)}
                    >
                        メイクシミュレーション
                    </button>
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
                {isOpen && (
                    <SimulatePage onClose={() => setIsOpen(false)} />
                )}
            </main>
            <Footer />
        </>
    );
}
