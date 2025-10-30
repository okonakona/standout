"use client";
import React from "react";
import ImageUploader from "@/components/uploader/ImageUploader";

export default function UploadPage() {
    return (
        <main style={{ padding: 24 }}>
            <h1>写真アップロード</h1>
            <p>顔がはっきり写る写真を選んでください。</p>
            <ImageUploader />
        </main>
    );
}
