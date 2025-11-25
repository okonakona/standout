"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEditorImage } from "@/utils/imageSession";
import styles from "@/styles/camera.module.css";

const MAX_WIDTH = 1080; // 短辺の上限
const MAX_HEIGHT = 1440; // 長辺の上限（縦長想定）

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
                        facingMode: "user", // インカメ
                        width: { ideal: 1080, max: MAX_WIDTH },
                        height: { ideal: 1440, max: MAX_HEIGHT },
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

        // 実際のカメラ解像度を取得
        const vw = video.videoWidth || 720;
        const vh = video.videoHeight || 1280;

        // // 比率を維持したまま、MAX_WIDTH / MAX_HEIGHT に収める
        // let targetW = vw;
        // let targetH = vh;
        // const ratio = vw / vh; // 横 / 縦

        // // まず長辺側を MAX_HEIGHT に収める（縦長想定）
        // if (targetH > MAX_HEIGHT) {
        //     targetH = MAX_HEIGHT;
        //     targetW = Math.round(targetH * ratio);
        // }
        // // それでも横が大きい場合は横も制限
        // if (targetW > MAX_WIDTH) {
        //     targetW = MAX_WIDTH;
        //     targetH = Math.round(targetW / ratio);
        // }

        // canvas.width = targetW;
        // canvas.height = targetH;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // ctx.drawImage(video, 0, 0, targetW, targetH);

        // JPEG画質は 0.9 に少しアップ（必要なら変えてOK）
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        saveEditorImage(dataUrl);
        router.push("/editor");
    };

    return (
        <div className={styles.cameraWrap}>
            {/* スマホ幅にフィットさせる */}
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
            <div className={styles.controls}>
                <button onClick={captureAndGo}>撮影して次へ</button>
            </div>
            <canvas ref={canvasRef} className={styles.hiddenCanvas} />
        </div>
    );
}
