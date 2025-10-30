"use client";
import React from "react";
import Camera from "@/features/Camera/Camera";

export default function CameraPage() {
    return (
        <main style={{ padding: 24 }}>
            <h1>カメラ</h1>
            <Camera />
        </main>
    );
}
