"use client";
import Link from "next/link";
import { loadRoleModels, getActiveRoleId } from "@/utils/roleSession";

export default function RoleNext() {
    const id = getActiveRoleId();
    const role = loadRoleModels().find((r) => r.id === id) || null;

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
