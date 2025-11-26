"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/camera.module.css";

const MAX_WIDTH = 1920; // 短辺の上限
const MAX_HEIGHT = 1080; // 長辺の上限（縦長想定）

export default function Camera() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const router = useRouter();

    // カメラ起動
    useEffect(() => {
        let videoEventCleanup: (() => void) | null = null;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "user" }, // インカメ
                        width: { ideal: MAX_WIDTH },
                        height: { ideal: MAX_HEIGHT },
                        aspectRatio: { ideal: 0.5625 },
                    },
                    audio: false,
                });
                streamRef.current = stream;

                if (videoRef.current) {
                    const video = videoRef.current;
                    video.srcObject = stream;

                    const handleLoadedMetadata = () => {
                        video.play().catch((playError) => {
                            if (playError instanceof Error) {
                                if (playError.name === "AbortError") {
                                    console.log("Video play was interrupted (component update).");
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

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 実際のカメラ解像度
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
            console.warn("Video size not ready");
            return;
        }

        // 上限付きで縮小スケールを計算
        const scale = Math.min(MAX_WIDTH / vw, MAX_HEIGHT / vh, 1);
        const targetW = Math.round(vw * scale);
        const targetH = Math.round(vh * scale);

        // キャンバスに反映
        canvas.width = targetW;
        canvas.height = targetH;

        // ここで実際のフレームを書き込む
        ctx.drawImage(video, 0, 0, targetW, targetH);

        // JPEG に変換してセッション保存
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        saveEditorImage(dataUrl);

        router.push("/editor");
    };

    return (
        <div className={styles.cameraWrap}>
            {/* スマホ幅にフィットさせる */}
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
            <div className={styles.controls}>
                <button onClick={captureAndGo} className={styles.cameraButton}></button>
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />
        </div>
    );
}
