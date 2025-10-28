'use client';

import React, { useRef, useEffect, useState } from 'react';
import styles from '../../styles/camera.module.css';

interface CameraProps {
  onPhotoTaken?: (imageData: string) => void;
}

export default function Camera({ onPhotoTaken }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // フロントカメラを使用
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('カメラアクセスエラー:', err);
      setError('カメラにアクセスできませんでした。');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsStreaming(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // キャンバスサイズをビデオサイズに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 画像データを取得
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    if (onPhotoTaken) {
      onPhotoTaken(imageData);
    }
  };

  const switchCamera = async () => {
    stopCamera();
    // TODO: フロント/リアカメラの切り替え機能
    setTimeout(() => startCamera(), 100);
  };

  if (error) {
    return (
      <div className={styles.camera}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={startCamera} className={styles.retryButton}>
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.camera}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.video}
        />
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </div>
      
      <div className={styles.controls}>
        <button
          onClick={switchCamera}
          className={styles.switchButton}
          disabled={!isStreaming}
        >
          切り替え
        </button>
        
        <button
          onClick={takePhoto}
          className={styles.captureButton}
          disabled={!isStreaming}
        >
          📷
        </button>
      </div>
    </div>
  );
}