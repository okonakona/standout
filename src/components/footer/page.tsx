import Link from "next/link";
import styles from "./style.module.css";
import Image from "next/image";
import CameraButton from "../cameraButton/page";

export default function Footer() {
    return (
        <footer>
            <CameraButton />
            <div className={styles.content}>
                <nav>
                    <ul>
                        <li>
                            <Link href="/">
                                <Image
                                    src="/assets/heartIcon.svg"
                                    width={33}
                                    height={33}
                                    alt="ハートのアイコン"
                                />
                                お気に入り
                            </Link>
                        </li>
                        <li>
                            <Link href="/">
                                <Image
                                    src="/assets/homeIcon.svg"
                                    width={33}
                                    height={33}
                                    alt="家のアイコン"
                                />
                                ホーム
                            </Link>
                        </li>
                        <li>
                            <Link href="/mypage">
                                <Image
                                    src="/assets/peopleIcon.svg"
                                    width={33}
                                    height={33}
                                    alt="人型のアイコン"
                                />
                                マイページ
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
