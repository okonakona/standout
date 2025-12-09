export { default as ColorPointSvg } from "./ColorPointSvg";
export { default as LipPointSvg } from "./LipPointSvg";

// 便利な型定義もエクスポート
export type SvgProps = {
    className?: string;
    style?: React.CSSProperties;
    fillColor?: string;
    strokeColor?: string;
    width?: number;
    height?: number;
};
