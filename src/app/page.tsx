"use client";
import Link from "next/link";

export default function Home() {
    return (
        <main style={{ padding: 24 }}>
            <h1>メンズメイク・トレーニング</h1>
            <p>はじめにやりたいことを選んでください。</p>

            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <Link
                    href="/role"
                    style={{ border: "1px solid #ccc", padding: "12px 16px", borderRadius: 8 }}
                >
                    ロールモデル選択（作成）
                </Link>
                <Link
                    href="/simulate"
                    style={{ border: "1px solid #ccc", padding: "12px 16px", borderRadius: 8 }}
                >
                    シミュレーション
                </Link>
            </div>
        </main>
    );
}
