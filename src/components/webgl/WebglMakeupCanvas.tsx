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

// 簡易ノイズ（パウダーなどのざらつき用）
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// ソフトベール（下地とか）
vec3 applySoftVeil(vec3 base, vec3 tint, float k) {
  vec3 mixColor = mix(base, tint, 0.4 * k);
  // 少しだけ明るく
  mixColor = mixColor + vec3(0.03 * k);
  return mix(base, mixColor, k);
}

// リキッドファンデ系（少し肌を滑らかに見せる）
vec3 applyLiquidFoundation(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.6 * k);
  float avg = (c.r + c.g + c.b) / 3.0;
  c = mix(vec3(avg), c, 0.7);
  return mix(base, c, k);
}

// コンシーラー（カバー力強め、マット寄り）
vec3 applyConcealer(vec3 base, vec3 tint, float k) {
  vec3 c = mix(base, tint, 0.75 * k);
  c = pow(c, vec3(1.05));
  return mix(base, c, k);
}

// パウダー（粉感）
vec3 applyPowder(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.5 * k);
  float n = hash(uv * 600.0) * 2.0 - 1.0;
  float grain = 1.0 + 0.03 * n * k;
  c *= grain;
  c = mix(c, vec3((c.r + c.g + c.b) / 3.0), 0.05);
  return mix(base, c, k);
}

// ハイライト / チーク（ツヤ＋発色）
vec3 applyHighlight(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.7 * k);
  vec2 center = vec2(0.5, 0.4);
  float dist = distance(uv, center);
  float glow = smoothstep(0.6, 0.0, dist);
  c += glow * 0.18 * k;
  return mix(base, c, k);
}

// シェーディング（影）
vec3 applyContour(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.7 * k);
  float avg = (c.r + c.g + c.b) / 3.0;
  c = mix(vec3(avg), c, 0.85);
  return mix(base, c, k);
}

// アイブロウ（マット寄り・毛っぽさ）
vec3 applyBrow(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.8 * k);
  float stripe = sin(uv.y * 200.0) * 0.03;
  c *= (1.0 + stripe * k);
  c = mix(c, c * 0.92, k);
  return mix(base, c, k);
}

// アイシャドウ（パウダー＋グラデ）
vec3 applyEyeshadow(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.6 * k);
  float grad = smoothstep(0.8, 0.2, uv.y);
  c = mix(base, c, grad * k);
  float n = hash(uv * 800.0) * 2.0 - 1.0;
  c *= (1.0 + 0.02 * n * k);
  return c;
}

// リップ（ツヤ感）
vec3 applyLipGloss(vec3 base, vec3 tint, float k, vec2 uv) {
  vec3 c = mix(base, tint, 0.85 * k);
  vec2 center = vec2(0.5, 0.55);
  float dist = distance(uv, center);
  float spec = smoothstep(0.3, 0.0, dist);
  spec = pow(spec, 4.0);
  c += vec3(1.0, 1.0, 1.0) * spec * 0.55 * k;
  return mix(base, c, k);
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
  vec3 tint = uTintColor;
  vec3 outColor;

  if (uEffectId == 0) {
    outColor = applySoftVeil(base.rgb, tint, k);
  } else if (uEffectId == 1) {
    outColor = applyLiquidFoundation(base.rgb, tint, k, vUv);
  } else if (uEffectId == 2) {
    outColor = applyConcealer(base.rgb, tint, k);
  } else if (uEffectId == 3) {
    outColor = applyPowder(base.rgb, tint, k, vUv);
  } else if (uEffectId == 4) {
    outColor = applyHighlight(base.rgb, tint, k, vUv);
  } else if (uEffectId == 5) {
    outColor = applyContour(base.rgb, tint, k, vUv);
  } else if (uEffectId == 6) {
    outColor = applyBrow(base.rgb, tint, k, vUv);
  } else if (uEffectId == 7) {
    outColor = applyEyeshadow(base.rgb, tint, k, vUv);
  } else if (uEffectId == 8) {
    outColor = applyLipGloss(base.rgb, tint, k, vUv);
  } else {
    vec3 c = mix(base.rgb, tint, k);
    outColor = c;
  }

  gl_FragColor = vec4(outColor, base.a);
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
