import { ReactNode } from "react";
import Navigation from "./navigation";
import styles from "./NavigationLayout.module.css";

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
            {/* 未選択時のみ上部ヘッダーを表示 */}
            {!isSelected && showHeader && (
                <header className={styles.header}>
                    <button className={styles.backButton} onClick={onBackClick}>
                        ◀
                    </button>
                    <button className={styles.okButton} onClick={onOkClick}>
                        ok
                    </button>
                </header>
            )}

            <Navigation activeId={activeId} onItemClickAction={onItemClickAction} />

            {children && <main className={styles.content}>{children}</main>}

            {/* 選択時のみ下部ボタンを表示 */}
            {isSelected && (
                <footer className={styles.bottomBar}>
                    <button
                        className={styles.cancelButton}
                        onClick={() => onItemClickAction?.(null)}
                    >
                        ×
                    </button>
                    <button className={styles.confirmButton} onClick={onOkClick}>
                        ok
                    </button>
                </footer>
            )}
        </div>
    );
}
