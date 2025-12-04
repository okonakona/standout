import React from "react";
import styles from "@/styles/colorSvg.module.css";

type ColorPointSvgProps = {
    className?: string;
    style?: React.CSSProperties;
    fillColor?: string;
    strokeColor?: string;
    width?: number;
    height?: number;
};

export default function ColorPointSvg({
    className,
    style,
    fillColor = "#91786D",
    strokeColor = "#454A53",
    width = 50,
    height = 54,
}: ColorPointSvgProps) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 50 54"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.svg}
        >
            <path
                d="M44.0296 28.2634C38.1468 39.0415 20.651 39.5822 9.81242 38.7785C7.67558 38.62 7.22478 35.0522 9.05392 33.9362C13.8865 30.9877 19.9197 25.9377 24.4755 17.5907C27.4227 12.191 34.1892 10.2029 39.5889 13.1501C44.9886 16.0973 46.9767 22.8637 44.0296 28.2634Z"
                fill={fillColor}
            />
            <path
                d="M38.5248 11.1113C43.6821 13.9261 45.5811 20.3891 42.7662 25.5464C39.9282 30.746 34.2589 33.5279 27.8505 34.898C21.4536 36.2655 14.4242 36.2025 9.02541 35.8021C8.28651 35.7473 7.75035 35.0969 7.61673 34.1677C7.48341 33.2405 7.80182 32.3049 8.48987 31.8851C13.3816 28.9006 19.4838 23.7912 24.0897 15.3526C26.9045 10.1954 33.3676 8.2966 38.5248 11.1113Z"
                stroke={strokeColor}
            />
        </svg>
    );
}
