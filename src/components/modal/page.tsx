import styles from './style.module.css'
import Image from 'next/image'

interface ModalProps{
    title: string;
    text: string;
    src: string;
    attention: string;
}


const Modal = ({ title, text, src, attention }: ModalProps) => {
    return(
        <div className={styles.content}>
            <div className={styles.modal}>
                <h2>{title}</h2>
                <div className={styles.modalCnt}>
                    <p>{text}</p>
                    <div className={styles.imgWrap}>
                        <Image src={src} alt="確認画像" width={0} height={0} sizes="100vw"/>
                    </div>
                    <p className={styles.attention}>{attention}</p>
                </div>
                <div className={styles.check}>
                    <button className={styles.checkNo}>キャンセル</button>
                    <button className={styles.checkYes}>確定</button>
                </div>
            </div>
        </div>
    )
}

export default Modal

