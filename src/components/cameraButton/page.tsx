"use client";
import { useSimulateModal } from "@/contexts/SimulateModalContext";
import styles from './style.module.css'
import Image from 'next/image'

export default function CameraButton () {
    const { open } = useSimulateModal();
    return(
        <div className={styles.content}>
            <button className={styles.button} onClick={open}>
                <Image src="/assets/cameraIcon.svg" alt="サンプル" width={50} height={50} />
            </button>
        </div>
    )
}