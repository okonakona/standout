"use client";
import styles from './style.module.css'

const GENRE_LABEL: Record<string, string> = {
    brand: "ブランドもの",
    affordable: "コスパ最強",
    cool: "デザイン重視",
    simple: "シンプル",
};

export default function CosmeticsBlock({ title, items }: { title: string; items: any[] }) {
    return (
        <div className={styles.content}>
            <h2>{title}</h2>
            {items.length === 0 ? (
                <p>まだありません</p>
            ) : (
                <div className={styles.cosmeticsWrap}>
                    <div className={styles.cosmeticsRow}>
                        {items.map((item, idx) => (
                            <figure
                                key={item.id ?? `${item.productName}-${idx}`}
                            >
                                <img
                                    src="/assets/eyeshadow.png"
                                    alt="アイシャドウ"/>
                                <h3>{item.productName}</h3>
                                <p>{item.brand}</p>
                                <p >{item.price}</p>
                                <p>
                                    {GENRE_LABEL[item.genre]}
                                </p>
                                <img src={item.image} alt="" />
                            </figure>
                    ))}
                    </div>
                </div>
            )}
        </div>
    );
}
