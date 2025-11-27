"use client";
import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/uploader.module.css";

export default function ImageUploader() {
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            saveEditorImage(dataUrl);
            router.push("/editor");
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
