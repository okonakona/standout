"use client";
import Link from "next/link";

export default function ResultPage() {
    return (
        <main style={{ padding: 24 }}>
            <h1>結果</h1>
            <p>ここにビフォー/アフターや使用色・おすすめコスメを表示します。</p>
            <Link href="/editor">戻る</Link>
        </main>
    );
}
