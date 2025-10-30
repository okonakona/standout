"use client";
import { useEffect, useState } from "react";
import { loadRoleModels, setActiveRoleId, getActiveRoleId, RoleModel } from "@/utils/roleSession";
import Link from "next/link";

export default function SimulatePage() {
    const [list, setList] = useState<RoleModel[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const roles = loadRoleModels();
        setList(roles);
        setSelectedId(getActiveRoleId() ?? roles[0]?.id ?? null);
    }, []);

    const onChoose = (id: string) => {
        setSelectedId(id);
        setActiveRoleId(id);
    };

    return (
        <main style={{ padding: 24 }}>
            <h1>シミュレーション</h1>
            {list.length === 0 ? (
                <>
                    <p>ロールモデルがまだありません。</p>
                    <Link href="/role">作成する</Link>
                </>
            ) : (
                <>
                    <p>ロールモデルを選んで、写真の用意方法を選択してください。</p>
                    <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
                        {list.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => onChoose(r.id)}
                                aria-pressed={selectedId === r.id}
                            >
                                {r.name}（{r.presetId}）
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <Link href="/upload">写真をアップロード</Link>
                        <Link href="/camera">カメラで撮影</Link>
                    </div>
                </>
            )}
        </main>
    );
}
