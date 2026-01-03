import styles from './style.module.css'
import Image from 'next/image'



export default function Header () {
    return(
        <header>
            <div className={styles.content}>
                <div className={styles.imgBox}>
                    <div className={styles.logo}>
                        <Image src="/assets/logo.svg" alt="mensupのロゴ" width={154} height={71} />
                    </div>
                </div>
            </div>
        </header>
    )
}