// src/app/result/page.tsx
"use client";
import { useEffect, useState } from "react";
import { listSim } from "@/utils/simStore";
import Link from "next/link";

type Item = { id: string; createdAt: number; dataUrl: string; note?: string };

export default function ResultPage() {
    const [items, setItems] = useState<Item[]>([]);
    useEffect(() => {
        (async () => setItems(await listSim()))();
    }, []);
    return (
        <main style={{ padding: 24 }}>
            <h1>保存した結果</h1>
            {items.length === 0 ? (
                <>
                    <p>まだ結果がありません。</p>
                    <Link href="/editor">編集に戻る</Link>
                </>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
                        gap: 12,
                    }}
                >
                    {items.map((i) => (
                        <figure key={i.id} style={{ border: "1px solid #ddd", padding: 8 }}>
                            <img
                                src={i.dataUrl}
                                alt="result"
                                style={{ width: "100%", height: "auto", display: "block" }}
                            />
                            <figcaption style={{ fontSize: 12, color: "#666" }}>
                                {new Date(i.createdAt).toLocaleString()} {i.note ?? ""}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
            <div style={{ marginTop: 16 }}>
                <Link href="/editor">編集に戻る</Link>
            </div>
        </main>
    );
}
