import React from "react";

type LipPointSvgProps = {
    className?: string;
    style?: React.CSSProperties;
    fillColor?: string;
    strokeColor?: string;
    width?: number;
    height?: number;
};

export default function LipPointSvg({
    className,
    style,
    fillColor = "#FF9B9B",
    strokeColor = "#000000",
    width = 23,
    height = 50,
}: LipPointSvgProps) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 23 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M21.9203 29.7485V20.6802H20.1935C20.1935 20.6802 20.1935 7.07746 20.1935 4.70218C20.1935 2.32746 18.0344 1.4635 16.5225 2.32746C11.6602 5.10626 6.80638 11.1796 6.80638 12.6909V20.6802H5.07956V29.7485H4V47.5602C4 48.575 4.82259 49.3963 5.83615 49.3963H21.1639C22.1786 49.3963 23 48.5749 23 47.5602V29.7485H21.9203ZM7.45475 47.2371H6.15903V31.9076H7.45484L7.45475 47.2371ZM20.4097 29.7485H6.59134V22.1914H20.4096V25.9699L20.4097 29.7485Z"
                fill={fillColor}
            />
            <rect x="6" y="22" width="15" height="8" fill={fillColor} />
            <rect x="6" y="31" width="2" height="16" fill={fillColor} />
            <path
                d="M12.7705 0.761719C13.376 0.415702 14.1082 0.418187 14.6826 0.737305C15.2398 1.04698 15.6933 1.68161 15.6934 2.70215V18.6797L16.1934 18.6807H15.6934V19.1807H17.4199V28.248H18.5V45.5605C18.4998 46.2988 17.9025 46.8964 17.1641 46.8965H1.83594C1.09848 46.8964 0.500179 46.2987 0.5 45.5605V28.248H1.5791V19.1807H3.30664V10.6904C3.30678 10.6109 3.34561 10.4306 3.48047 10.1309C3.60916 9.8448 3.80427 9.49555 4.06152 9.0957C4.57539 8.29705 5.31684 7.32949 6.21484 6.31641C8.01463 4.28604 10.4028 2.1149 12.7705 0.761719ZM1.65918 45.7373H3.95508V29.4072H1.65918V45.7373ZM2.0918 28.248H16.9102V27.748L16.9092 20.1914V19.6914H2.0918V28.248Z"
                stroke={strokeColor}
            />
        </svg>
    );
}
