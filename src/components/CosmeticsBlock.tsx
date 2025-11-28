"use client";

export default function CosmeticsBlock({ title, items }: { title: string; items: any[] }) {
    return (
        <div style={{ marginBottom: 32 }}>
            <h2>{title}</h2>
            {items.length === 0 ? (
                <p>まだありません</p>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
                        gap: 12,
                    }}
                >
                    {items.map((item, idx) => (
                        <figure
                            key={item.id ?? `${item.productName}-${idx}`}
                            style={{ border: "1px solid #ddd", padding: 8 }}
                        >
                            <h3>{item.productName}</h3>
                            <p style={{ fontSize: 12, color: "#666" }}>{item.brand}</p>
                            <p style={{ fontSize: 12 }}>{item.price}</p>
                            <img src={item.image} alt="" />
                        </figure>
                    ))}
                </div>
            )}
        </div>
    );
}
