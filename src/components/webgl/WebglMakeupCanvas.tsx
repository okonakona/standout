// src/components/webgl/WebglMakeupCanvas.tsx
"use client";

import React, { useEffect, useRef } from "react";
import * as twgl from "twgl.js";

type Props = {
    base: HTMLCanvasElement | HTMLImageElement; // 2D 合成結果
    mask: HTMLCanvasElement; // activeStep のマスク
    tintColor: string; // #rrggbb
    strength: number; // 0..1
    effectId: number; // STEP_CONFIG の effectId
};

const vs = `
attribute vec2 position;
attribute vec2 texcoord;
varying vec2 vUv;
void main() {
  vUv = texcoord;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// 質感用の fragment shader
const fs = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uBaseTex;
uniform sampler2D uMaskTex;
uniform vec3 uTintColor;
uniform float uStrength;
uniform int uEffectId;

// ========= OKLAB 変換 =========

// sRGB(0..1) -> OKLAB
vec3 rgb_to_oklab(vec3 c) {
  // sRGB 前提
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  float l_ = pow(l, 1.0/3.0);
  float m_ = pow(m, 1.0/3.0);
  float s_ = pow(s, 1.0/3.0);

  return vec3(
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  );
}

// OKLAB -> sRGB(0..1)
vec3 oklab_to_rgb(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;

  vec3 rgb = vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );

  return clamp(rgb, 0.0, 1.0);
}

// OKLAB 空間で base と tint をブレンド
vec3 okMix(vec3 baseRgb, vec3 tintRgb, float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 lb = rgb_to_oklab(clamp(baseRgb, 0.0, 1.0));
  vec3 lt = rgb_to_oklab(clamp(tintRgb, 0.0, 1.0));
  vec3 lm = mix(lb, lt, t);
  return oklab_to_rgb(lm);
}

// ========= 質感用ノイズ & エフェクト =========

// 簡易ノイズ（パウダーなどのざらつき用）
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// ソフトベール（下地とか）
vec3 applySoftVeil(vec3 base, vec3 tint, float k) {
  // LAB 的になじませる
  vec3 c = okMix(base, tint, 0.4 * k);
  // 少しだけ明るく
  c = c + vec3(0.03 * k);
  // 最終的にも base との LAB ブレンド
  return okMix(base, c, k);
}

// リキッドファンデ系（少し肌を滑らかに見せる）
vec3 applyLiquidFoundation(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.6 * k);
  // コントラストを少し下げて「なめらか肌」っぽく
  float avg = (c.r + c.g + c.b) / 3.0;
  c = mix(vec3(avg), c, 0.7);
  return okMix(base, c, k);
}

// コンシーラー（カバー力強め、マット寄り）
vec3 applyConcealer(vec3 base, vec3 tint, float k) {
  vec3 c = okMix(base, tint, 0.75 * k);
  // ハイライトを少し抑えてマット寄りに
  c = pow(c, vec3(1.05));
  return okMix(base, c, k);
}

// パウダー（粉感）
vec3 applyPowder(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.5 * k);
  // ざらっとしたノイズ（微小な±を乗せる）
  float n = hash(uv * 600.0) * 2.0 - 1.0;
  float grain = 1.0 + 0.03 * n * k;
  c *= grain;
  // 少しだけソフトに
  float avg = (c.r + c.g + c.b) / 3.0;
  c = mix(c, vec3(avg), 0.05);
  return okMix(base, c, k);
}

// ハイライト / チーク（ツヤ＋発色）
vec3 applyHighlight(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.7 * k);
  // 疑似ハイライト（画面中心に近いほど光る感じ）
  vec2 center = vec2(0.5, 0.4);
  float dist = distance(uv, center);
  float glow = smoothstep(0.6, 0.0, dist);
  c += glow * 0.18 * k;
  return okMix(base, c, k);
}

// シェーディング（影）
vec3 applyContour(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.7 * k);
  float avg = (c.r + c.g + c.b) / 3.0;
  c = mix(vec3(avg), c, 0.85);
  return okMix(base, c, k);
}

// アイブロウ（マット寄り・毛っぽさ）
vec3 applyBrow(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.8 * k);
  float stripe = sin(uv.y * 200.0) * 0.03;
  c *= (1.0 + stripe * k);
  c = mix(c, c * 0.92, k); // ほんの少し暗く
  return okMix(base, c, k);
}

// アイシャドウ（パウダー＋グラデ）
vec3 applyEyeshadow(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.6 * k);
  float grad = smoothstep(0.8, 0.2, uv.y);
  c = mix(base, c, grad * k);
  float n = hash(uv * 800.0) * 2.0 - 1.0;
  c *= (1.0 + 0.02 * n * k);
  return okMix(base, c, k);
}

// リップ（ツヤ感）
vec3 applyLipGloss(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = okMix(base, tint, 0.85 * k);
  // 疑似スペキュラ（口中央付近が光る）
  vec2 center = vec2(0.5, 0.55);
  float dist = distance(uv, center);
  float spec = smoothstep(0.3, 0.0, dist);
  spec = pow(spec, 4.0);
  c += vec3(1.0) * spec * 0.55 * k;
  return okMix(base, c, k);
}

void main() {
  vec4 base = texture2D(uBaseTex, vUv);
  vec4 maskSample = texture2D(uMaskTex, vUv);

  float m = maskSample.a;
  if (m <= 0.0 || uStrength <= 0.0) {
    gl_FragColor = base;
    return;
  }

  float k = m * uStrength;
  vec3 tint = clamp(uTintColor, 0.0, 1.0);
  vec3 col;

  if (uEffectId == 0) {
    col = applySoftVeil(base.rgb, tint, k);
  } else if (uEffectId == 1) {
    col = applyLiquidFoundation(base.rgb, tint, k, vUv);
  } else if (uEffectId == 2) {
    col = applyConcealer(base.rgb, tint, k);
  } else if (uEffectId == 3) {
    col = applyPowder(base.rgb, tint, k, vUv);
  } else if (uEffectId == 4) {
    col = applyHighlight(base.rgb, tint, k, vUv);
  } else if (uEffectId == 5) {
    col = applyContour(base.rgb, tint, k, vUv);
  } else if (uEffectId == 6) {
    col = applyBrow(base.rgb, tint, k, vUv);
  } else if (uEffectId == 7) {
    col = applyEyeshadow(base.rgb, tint, k, vUv);
  } else if (uEffectId == 8) {
    col = applyLipGloss(base.rgb, tint, k, vUv);
  } else {
    // デフォルト：OKLAB で単純ブレンド
    col = okMix(base.rgb, tint, k);
  }

  gl_FragColor = vec4(col, base.a);
}
`;

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return [r, g, b];
}

export function WebglMakeupCanvas({ base, mask, tintColor, strength, effectId }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const w = (base as HTMLCanvasElement).width || (base as HTMLImageElement).width;
        const h = (base as HTMLCanvasElement).height || (base as HTMLImageElement).height;
        if (!w || !h) return;

        canvas.width = w;
        canvas.height = h;

        const gl = canvas.getContext("webgl");
        if (!gl) {
            console.warn("[WebGL] not supported, fallback to hidden");
            return;
        }

        twgl.setDefaults({ attribPrefix: "a_" });

        const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

        const arrays: twgl.Arrays = {
            position: {
                numComponents: 2,
                data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
            },
            texcoord: {
                numComponents: 2,
                data: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1],
            },
        };
        const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

        const baseTex = twgl.createTexture(gl, {
            src: base,
            flipY: 1, // ★ boolean ではなく number で型エラー回避
            min: gl.LINEAR,
            mag: gl.LINEAR,
        });

        const maskTex = twgl.createTexture(gl, {
            src: mask,
            flipY: 1,
            min: gl.LINEAR,
            mag: gl.LINEAR,
        });

        const [r, g, b] = hexToRgb(tintColor);

        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
        twgl.setUniforms(programInfo, {
            uBaseTex: baseTex,
            uMaskTex: maskTex,
            uTintColor: [r / 255, g / 255, b / 255],
            uStrength: strength,
            uEffectId: effectId,
        });
        twgl.drawBufferInfo(gl, bufferInfo);

        // cleanup は必要になったら追加
    }, [base, mask, tintColor, strength, effectId]);

    return (
        <canvas
            ref={canvasRef}
            className="practiceCanvas-webgl"
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none", // 入力は下の 2D に通す
            }}
        />
    );
}
