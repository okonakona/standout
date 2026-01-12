// src/lib/gl/shaders.ts

export const vertexShaderSource = /* glsl */ `#version 300 es
in vec4 position;
in vec2 texcoord;

out vec2 vUv;

void main() {
  gl_Position = position;
  vUv = vec2(texcoord.x, 1.0 - texcoord.y);
}
`;

export const fragmentShaderSource = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

// ベース顔画像
uniform sampler2D uBaseTexture;
// 手描きマスク（α）
uniform sampler2D uMaskTexture;

// メイク色 (sRGB)
uniform vec4 uTintColor;
// 重ね塗りの強さ (0..1)
uniform float uStrength;
// 質感タイプ (0: マット, 1: クリーム, 2: パウダー)
uniform float uTextureType;

// RGBをHSLに変換
vec3 rgb2hsl(vec3 rgb) {
    float maxVal = max(max(rgb.r, rgb.g), rgb.b);
    float minVal = min(min(rgb.r, rgb.g), rgb.b);
    float delta = maxVal - minVal;
    
    float h = 0.0;
    float s = 0.0;
    float l = (maxVal + minVal) / 2.0;
    
    if (delta > 0.0001) {
        s = delta / (1.0 - abs(2.0 * l - 1.0));
        
        if (maxVal == rgb.r) {
            h = mod((rgb.g - rgb.b) / delta, 6.0);
        } else if (maxVal == rgb.g) {
            h = (rgb.b - rgb.r) / delta + 2.0;
        } else {
            h = (rgb.r - rgb.g) / delta + 4.0;
        }
        h /= 6.0;
    }
    
    return vec3(h, s, l);
}

// HSLをRGBに変換
vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c / 2.0;
    
    vec3 rgb = vec3(0.0);
    
    if (h < 1.0/6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 2.0/6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 3.0/6.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 4.0/6.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 5.0/6.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }
    
    return rgb + m;
}

// Overlayブレンドモード
float overlayBlend(float base, float blend) {
    return base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
}

vec3 overlayBlendRGB(vec3 base, vec3 blend) {
    return vec3(
        overlayBlend(base.r, blend.r),
        overlayBlend(base.g, blend.g),
        overlayBlend(base.b, blend.b)
    );
}

// Multiplyブレンドモード
vec3 multiplyBlend(vec3 base, vec3 blend) {
    return base * blend;
}

// 肌色との適応的ブレンド
vec3 adaptiveSkinBlend(vec3 skinRgb, vec3 makeupRgb, float maskAlpha) {
    // 肌色の明度を計算
    vec3 skinHsl = rgb2hsl(skinRgb);
    vec3 makeupHsl = rgb2hsl(makeupRgb);
    
    // 肌の明度に応じてメイクの明度を調整
    float lightnessAdapt = mix(makeupHsl.z, skinHsl.z * 0.3 + makeupHsl.z * 0.7, 0.4);
    
    // 肌の彩度を少し保持
    float saturationBlend = mix(makeupHsl.y, makeupHsl.y * 0.9 + skinHsl.y * 0.1, 0.3);
    
    vec3 adaptedHsl = vec3(makeupHsl.x, saturationBlend, lightnessAdapt);
    vec3 adaptedRgb = hsl2rgb(adaptedHsl);
    
    // エッジのソフトニング
    float edgeSoftness = smoothstep(0.0, 0.15, maskAlpha) * smoothstep(1.0, 0.85, maskAlpha);
    float blendFactor = maskAlpha * (0.7 + edgeSoftness * 0.3);
    
    return mix(skinRgb, adaptedRgb, blendFactor);
}

// 質感エフェクト：パウダー
vec3 applyPowderTexture(vec3 color, vec2 uv, float intensity) {
    // 粗い粒子感を表現
    float noise = fract(sin(dot(uv * 300.0, vec2(12.9898, 78.233))) * 43758.5453);
    float grain = mix(0.97, 1.03, noise);
    
    // マットな質感（彩度を下げる）
    vec3 hsl = rgb2hsl(color);
    hsl.y *= 0.92; // 彩度を下げる
    hsl.z *= grain; // 粒子感
    
    return hsl2rgb(hsl) * mix(1.0, 0.98, intensity);
}

// 質感エフェクト：クリーム
vec3 applyCreamTexture(vec3 color, vec2 uv, float intensity) {
    // 滑らかな光沢感
    float highlight = pow(abs(sin(uv.x * 100.0) * sin(uv.y * 100.0)), 20.0) * 0.15;
    
    vec3 hsl = rgb2hsl(color);
    hsl.y *= 1.05; // 彩度を少し上げる
    hsl.z = min(1.0, hsl.z + highlight * intensity);
    
    return hsl2rgb(hsl);
}

// メインのブレンド処理
vec3 applyMakeup(vec3 baseRgb, vec3 tintRgb, float maskAlpha, float strength, float texType) {
    if (maskAlpha < 0.001) {
        return baseRgb;
    }
    
    // 肌色との適応的ブレンド
    vec3 blendedColor = adaptiveSkinBlend(baseRgb, tintRgb, maskAlpha);
    
    // 質感エフェクトを適用
    if (texType < 0.5) {
        // マット（デフォルト）
        blendedColor = mix(blendedColor, multiplyBlend(blendedColor, tintRgb * 1.1), 0.2);
    } else if (texType < 1.5) {
        // クリーム
        blendedColor = applyCreamTexture(blendedColor, vUv, maskAlpha * strength);
    } else {
        // パウダー
        blendedColor = applyPowderTexture(blendedColor, vUv, maskAlpha * strength);
    }
    
    // 強度で最終調整
    return mix(baseRgb, blendedColor, strength);
}

void main() {
  vec4 base = texture(uBaseTexture, vUv);
  float mask = texture(uMaskTexture, vUv).a;

  vec3 resultRgb = applyMakeup(base.rgb, uTintColor.rgb, mask, uStrength, uTextureType);

  // メイクを適用した部分は不透明にする
  outColor = vec4(resultRgb, 1.0);
}
`;
