"use client";

import { useState } from "react";
import styles from "./navigation.module.css";
import { LayerIcon, ColorIcon, BrushIcon, BlurIcon, ResetIcon } from "@/components/svg/Icons";

const tools: { id: string; label: string; Icon: React.FC<{ className?: string }> }[] = [
    {
        id: "color",
        label: "カラー",
        Icon: ColorIcon,
    },
    {
        id: "brush",
        label: "ブラシ",
        Icon: BrushIcon,
    },
    {
        id: "blur",
        label: "ぼかし",
        Icon: BlurIcon,
    },
    {
        id: "eraser",
        label: "修正",
        Icon: ResetIcon,
    },
    {
        id: "parts",
        label: "完了済み",
        Icon: LayerIcon,
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
                const Icon = tool.Icon;
                return (
                    <button
                        key={tool.id}
                        className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                        type="button"
                        onClick={() => handleItemClick(tool.id)}
                    >
                        <div className={styles.navIconWrapper}>
                            <Icon className={styles.navIcon} />
                        </div>
                        <span className={styles.navLabel}>{tool.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
