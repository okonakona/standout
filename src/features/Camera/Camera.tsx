"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/camera.module.css";

export default function Camera() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const width = 460;
    const height = 680;
    const router = useRouter();

    // カメラ起動
    useEffect(() => {
        let videoEventCleanup: (() => void) | null = null;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width, height, facingMode: "user" },
                    audio: false,
                });
                streamRef.current = stream;

                if (videoRef.current) {
                    const video = videoRef.current;
                    video.srcObject = stream;

                    // Video要素のイベントハンドラを追加
                    const handleLoadedMetadata = () => {
                        video.play().catch((playError) => {
                            if (playError instanceof Error) {
                                if (playError.name === "AbortError") {
                                    console.log(
                                        "Video play was interrupted - this is normal during component updates"
                                    );
                                } else {
                                    console.error("Video play failed:", playError);
                                }
                            }
                        });
                    };

                    const handleError = (event: Event) => {
                        console.error("Video error:", event);
                    };

                    video.addEventListener("loadedmetadata", handleLoadedMetadata);
                    video.addEventListener("error", handleError);

                    // イベントリスナーのクリーンアップ関数を設定
                    videoEventCleanup = () => {
                        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
                        video.removeEventListener("error", handleError);
                    };
                }
            } catch (err) {
                console.error("カメラの取得に失敗しました:", err);
            }
        })();

        // 後始末（ページ離脱で停止）
        return () => {
            videoEventCleanup?.();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        };
    }, []);

    // 撮影 → DataURL → 保存 → /editor
    const captureAndGo = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, width, height);

        // 圧縮率は必要に応じて調整（0.85 など）
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        saveEditorImage(dataUrl);
        router.push("/editor");
    };

    return (
        <div className={styles.cameraWrap}>
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
            <div className={styles.controls}>
                <button onClick={captureAndGo}> 撮影して次へ</button>
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />
        </div>
    );
}
