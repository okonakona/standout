import { ReactNode } from "react";
import Navigation from "./navigation";
import styles from "./NavigationLayout.module.css";
import { PrevIcon } from "@/components/svg/Icons";

type NavigationLayoutProps = {
    children?: ReactNode;
    activeId?: string | null;
    onItemClickAction?: (id: string | null) => void;
    onBackClick?: () => void;
    onOkClick?: () => void;
    showHeader?: boolean;
};

export default function NavigationLayout({
    children,
    activeId,
    onItemClickAction,
    onBackClick,
    onOkClick,
    showHeader = true,
}: NavigationLayoutProps) {
    const isSelected = activeId !== null && activeId !== undefined;

    return (
        <div className={styles.container}>
            {showHeader && (
                <header className={styles.header}>
                    <button
                        className={`${styles.backButton} ${isSelected ? styles.active : ""}`}
                        onClick={onBackClick}
                    >
                        <PrevIcon />
                    </button>
                    <button
                        className={`${styles.okButton} ${isSelected ? styles.active : ""}`}
                        onClick={onOkClick}
                    >
                        ok
                    </button>
                </header>
            )}
            <Navigation activeId={activeId} onItemClickAction={onItemClickAction} />
            {children && <main className={styles.content}>{children}</main>}
        </div>
    );
}
