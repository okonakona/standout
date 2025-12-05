"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./navigation.module.css";

const tools: { id: string; label: string; icon: string }[] = [
    {
        id: "parts",
        label: "レイヤー",
        icon: "/assets/icon/layer.svg",
    },
    {
        id: "color",
        label: "カラー",
        icon: "/assets/icon/color.svg",
    },
    {
        id: "brush",
        label: "ブラシ",
        icon: "/assets/icon/brush.svg",
    },
    {
        id: "blur",
        label: "ぼかし",
        icon: "/assets/icon/blur.svg",
    },
    {
        id: "reset",
        label: "修正",
        icon: "/assets/icon/reset.svg",
    },
];

type NavigationProps = {
    activeId?: string | null;
    onItemClickAction?: (id: string | null) => void;
};

export default function Navigation({
    activeId: externalActiveId,
    onItemClickAction,
}: NavigationProps) {
    const [internalActiveId, setInternalActiveId] = useState<string | null>(null);

    // 外部からactiveIdが渡された場合はそれを使用、そうでなければ内部状態を使用
    const activeId = externalActiveId !== undefined ? externalActiveId : internalActiveId;

    const handleItemClick = (id: string) => {
        // 既に選択されているアイテムをクリックした場合は選択解除
        const newActiveId = activeId === id ? null : id;

        // 内部状態を更新
        setInternalActiveId(newActiveId);
        // 外部のコールバックがあれば実行（選択解除時はnullを渡す）
        onItemClickAction?.(newActiveId);
    };
    return (
        <nav className={styles.navBar}>
            {tools.map((tool) => {
                const isActive = activeId === tool.id;
                return (
                    <button
                        key={tool.id}
                        className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                        type="button"
                        onClick={() => handleItemClick(tool.id)}
                    >
                        <div className={styles.navIconWrapper}>
                            <Image
                                src={tool.icon}
                                alt={tool.label}
                                width={20}
                                height={20}
                                className={styles.navIcon}
                                priority
                            />
                        </div>
                        <span className={styles.navLabel}>{tool.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
