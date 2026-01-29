"use client";
import React, { useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/camera.module.css";

export default function Camera() {
    const webcamRef = useRef<Webcam | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const MAX_WIDTH = 2160;
    const MAX_HEIGHT = 3840;
    const router = useRouter();

    // カメラ起動
    useEffect(() => {
        const originalStyle = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            width: document.body.style.width,
            height: document.body.style.height,
            overscrollBehavior: document.body.style.overscrollBehavior,
            touchAction: document.body.style.touchAction,
        };

        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.overscrollBehavior = "none";
        document.body.style.touchAction = "none";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehavior = "none";

        let videoEventCleanup: (() => void) | null = null;
        let rafId: number | null = null;

        const attachVideoEvents = () => {
            const video = webcamRef.current?.video;
            if (!video) {
                rafId = requestAnimationFrame(attachVideoEvents);
                return;
            }

            // Video要素のイベントハンドラを追加
            const handleLoadedMetadata = () => {
                video.play().catch((playError) => {
                    if (playError instanceof Error) {
                        if (playError.name === "AbortError") {
                            console.log(
                                "Video play was interrupted - this is normal during component updates",
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
        };

        attachVideoEvents();

        // 後始末（ページ離脱で停止）
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            videoEventCleanup?.();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            document.body.style.overflow = originalStyle.overflow;
            document.body.style.position = originalStyle.position;
            document.body.style.width = originalStyle.width;
            document.body.style.height = originalStyle.height;
            document.body.style.overscrollBehavior = originalStyle.overscrollBehavior;
            document.body.style.touchAction = originalStyle.touchAction;
            document.documentElement.style.overflow = "";
            document.documentElement.style.overscrollBehavior = "";
        };
    }, []);

    // 撮影 → DataURL → 保存 → /editor
    const captureAndGo = async () => {
        const video = webcamRef.current?.video ?? null;
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#103a71";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 距離感優先: 9:16キャンバス内に収まるよう全体を縮小配置（余白あり）
        const baseScale = Math.min(targetWidth / videoWidth, targetHeight / videoHeight);
        const scale = Math.min(baseScale * 1.5, 1);
        const drawWidth = Math.floor(videoWidth * scale);
        const drawHeight = Math.floor(videoHeight * scale);
        const drawX = Math.floor((targetWidth - drawWidth) / 2);
        const drawY = Math.floor((targetHeight - drawHeight) / 2);

        // 内カメラ反転の補正（保存画像は反転しない）
        ctx.save();
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // 圧縮率は必要に応じて調整（0.85 など）
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        saveEditorImage(dataUrl);
        router.push("/editor");
    };

    return (
        <div className={styles.cameraWrap}>
            <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={false}
                className={styles.video}
                videoConstraints={{
                    facingMode: "user",
                    aspectRatio: 9 / 16,
                    width: { ideal: 720, max: MAX_WIDTH },
                    height: { ideal: 1280, max: MAX_HEIGHT },
                }}
                onUserMedia={(stream) => {
                    streamRef.current = stream;
                }}
                onUserMediaError={(err) => {
                    console.error("カメラの取得に失敗しました:", err);
                }}
                playsInline
            />
            <div className={styles.controls}>
                <button onClick={captureAndGo} className={styles.cameraButton}></button>
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />
        </div>
    );
}
