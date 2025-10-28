import React from 'react';
import styles from '../styles/uploader.module.css';

interface ImageUploaderProps {
  onImageSelected?: (file: File) => void;
}

export default function ImageUploader({ onImageSelected }: ImageUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageSelected) {
      onImageSelected(file);
    }
  };

  return (
    <div className={styles.uploader}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={styles.fileInput}
      />
      <div className={styles.uploadArea}>
        <p>画像をアップロードしてください</p>
        <button className={styles.uploadButton}>ファイルを選択</button>
      </div>
    </div>
  );
}