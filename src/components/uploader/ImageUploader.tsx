"use client";
import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/uploader.module.css";

export default function ImageUploader() {
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const MAX_WIDTH = 2160;
    const MAX_HEIGHT = 3840;

    const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const src = String(reader.result);
            const img = new Image();
            img.onload = () => {
                const imgWidth = img.width;
                const imgHeight = img.height;

                // カメラ撮影と同じ 9:16 キャンバスに統一（距離感優先）
                const targetRatio = 9 / 16;
                let targetWidth: number;
                let targetHeight: number;

                // まず高さ基準で 9:16 を作る
                targetHeight = Math.min(imgHeight, MAX_HEIGHT);
                targetWidth = Math.floor(targetHeight * targetRatio);

                // もし幅が足りなければ幅基準に切り替え
                if (targetWidth > imgWidth) {
                    targetWidth = Math.min(imgWidth, MAX_WIDTH);
                    targetHeight = Math.floor(targetWidth / targetRatio);
                }

                if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
                    const scale = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
                    targetWidth = Math.floor(targetWidth * scale);
                    targetHeight = Math.floor(targetHeight * scale);
                }

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.fillStyle = "#103a71";
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // 距離感優先でフィット（ほんの少し拡大）
                const baseScale = Math.min(targetWidth / imgWidth, targetHeight / imgHeight);
                const scale = Math.min(baseScale * 1.05, 1);
                const drawWidth = Math.floor(imgWidth * scale);
                const drawHeight = Math.floor(imgHeight * scale);
                const drawX = Math.floor((targetWidth - drawWidth) / 2);
                const drawY = Math.floor((targetHeight - drawHeight) / 2);

                ctx.drawImage(img, 0, 0, imgWidth, imgHeight, drawX, drawY, drawWidth, drawHeight);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
                saveEditorImage(dataUrl);
                router.push("/editor");
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className={styles.wrap}>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onSelect}
                className={styles.fileInput}
            />
        </div>
    );
}
