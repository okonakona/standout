"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/camera.module.css";

export default function Camera() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const width = 383;
    const height = 680;
    const MAX_WIDTH = 1080;
    const MAX_HEIGHT = 1920;
    const router = useRouter();

    // カメラ起動
    useEffect(() => {
        let videoEventCleanup: (() => void) | null = null;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user", // インカメ
                        width: { ideal: width, max: MAX_WIDTH },
                        height: { ideal: height, max: MAX_HEIGHT },
                    },
                    audio: false,
                });
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
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

        // ビデオの実際のサイズを取得
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // 縦長の比率（9:16）でキャンバスサイズを決定
        const targetRatio = 9 / 16;
        let targetWidth: number;
        let targetHeight: number;

        // 縦長のキャンバスサイズを計算
        if (videoHeight > videoWidth) {
            // 既に縦長の場合
            targetWidth = videoWidth;
            targetHeight = videoHeight;
        } else {
            // 横長の場合、高さを基準に縦長の幅を計算
            targetHeight = videoHeight;
            targetWidth = Math.floor(videoHeight * targetRatio);
        }

        // 最大サイズを超えないようにスケーリング
        if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
            const scale = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
            targetWidth = Math.floor(targetWidth * scale);
            targetHeight = Math.floor(targetHeight * scale);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 映像の中央部分を切り取って描画
        const sourceX = (videoWidth - targetWidth) / 2;
        const sourceY = 0;

        ctx.drawImage(
            video,
            sourceX,
            sourceY,
            targetWidth,
            targetHeight, // 元映像の切り取り範囲
            0,
            0,
            targetWidth,
            targetHeight // キャンバスへの描画範囲
        );

        // 圧縮率は必要に応じて調整（0.85 など）
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        saveEditorImage(dataUrl);
        router.push("/editor");
    };

    return (
        <div className={styles.cameraWrap}>
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
            <div className={styles.controls}>
                <button onClick={captureAndGo} className={styles.cameraButton}></button>
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />
        </div>
    );
}
