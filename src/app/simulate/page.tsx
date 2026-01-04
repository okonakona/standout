"use client";
import styles from './style.module.css'
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
        <main>
            <div className={styles.content}>
                <div className={styles.contentWrap}>
                    <h1>今すぐシミュレーションを始めましょう</h1>
                    {/* 保留になったロールモデル部分のコードをお取り置きしています
                    {list.length === 0 ? (
                        <>
                            <p>ロールモデルがまだありません。</p>
                            <Link href="/role">作成する</Link>
                        </>
                    ) : (
                        <>
                            <p>ロールモデルを選んで、写真の用意方法を選択してください。</p>
                            <div>
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
                        </>
                    )} */}
                    <div className={styles.btnWrap}>
                        <Link href="/upload" className={styles.button} data-icon="camera">写真をアップロード</Link>
                        <Link href="/camera" className={styles.button} data-icon="gallery">カメラで撮影</Link>
                    </div>
                    <button className={styles.closeBtn}>キャンセル</button>
                </div>
            </div>
        </main>
    );
}
