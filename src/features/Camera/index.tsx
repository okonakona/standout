"use client";
import React, { useEffect, useRef } from "react";

export default function Camera() {
    const videoRef = useRef(null);
    const photoRef = useRef(null);
    const width = 460;
    const height = 680;


  // カメラ起動
    const getVideo = () => {
    navigator.mediaDevices
        .getUserMedia({
        video: { width: width, height: height },
        })
        .then((stream) => {
        const video = videoRef.current;
        if (video) {
            video.srcObject = stream;
            video.play();
        }
        })
        .catch((err) => {
        console.error("カメラの取得に失敗しました:", err);
        });
    };

    useEffect(() => {
    getVideo();
  }, []); // ← 初回のみ実行

  // 撮影
    const takePhoto = () => {
    const video = videoRef.current;
    const photo = photoRef.current;

    if (!video || !photo) return;

    photo.width = width;
    photo.height = height;
    const ctx = photo.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    };

  // 写真を消す
    const closePhoto = () => {
    const photo = photoRef.current;
    if (!photo) return;
    const ctx = photo.getContext("2d");
    ctx.clearRect(0, 0, photo.width, photo.height);
    };

    return (
    <div style={{ textAlign: "center" }}>
        <h1>カメラ</h1>

        <p>Video</p>
        <div>
        <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: width, height: height, background: "#000" }}
        />
        <br />
        <button onClick={takePhoto}>📸 Capture</button>
        </div>

        <p>Photo</p>
        <div>
        <canvas
            ref={photoRef}
            style={{ width: width, height: height, border: "1px solid #ccc" }}
        />
        <br />
        <button onClick={closePhoto}>🗑 Delete</button>
        </div>
    </div>
    );
}
