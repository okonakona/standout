"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadRoleModels, getActiveRoleId, RoleModel } from "@/utils/roleSession";

export default function RoleNext() {
    const [role, setRole] = useState<RoleModel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = getActiveRoleId();
        const foundRole = loadRoleModels().find((r) => r.id === id) || null;
        setRole(foundRole);
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <main style={{ padding: 24 }}>
                <p>読み込み中...</p>
            </main>
        );
    }

    return (
        <main style={{ padding: 24 }}>
            <h1>写真を用意しましょう</h1>
            {role && (
                <p style={{ margin: "8px 0" }}>
                    選択中のロールモデル：<b>{role.name}</b>（{role.presetId}）
                </p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
                <Link href="/upload">写真をアップロード</Link>
                <Link href="/camera">カメラで撮影</Link>
            </div>
        </main>
    );
}
