"use client";
import styles from './style.module.css'

const GENRE_LABEL: Record<string, string> = {
    brand: "ブランドもの",
    affordable: "コスパ最強",
    cool: "デザイン重視",
    simple: "シンプル",
};
const CATEGORY_IMAGE: Record<string, string> = {
    ground: "/assets/ground.png",
    foundation: "/assets/foundation.png",
    concealer: "/assets/concealer.png",
    powder: "/assets/powder.png",
    highlight: "/assets/highlight.png",
    cheek: "/assets/cheek.png",
    shading: "/assets/shading.png",
    eyebrow: "/assets/eyebrow.png",
    eyeshadow: "/assets/eyeshadow.png",
    lip: "/assets/lip.png",
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
                                    src={CATEGORY_IMAGE[item.category] ?? "/assets/default.png"}
                                    alt={title}
                                />
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
