// src/lib/gl/shaders.ts

export const vertexShaderSource = /* glsl */ `#version 300 es
in vec4 position;
in vec2 texcoord;

out vec2 vUv;

void main() {
  gl_Position = position;
  vUv = texcoord;
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

// 単純な "塗り" ブレンド（後で overlay/multiply に差し替え可能）
vec3 applyMakeup(vec3 baseRgb, vec3 tintRgb, float maskAlpha, float strength) {
  // maskAlpha: ユーザーが塗ったかどうか
  float k = maskAlpha * strength;
  return mix(baseRgb, tintRgb, k);
}

void main() {
  vec4 base = texture(uBaseTexture, vUv);
  float mask = texture(uMaskTexture, vUv).a;

  vec3 resultRgb = applyMakeup(base.rgb, uTintColor.rgb, mask, uStrength);

  outColor = vec4(resultRgb, base.a);
}
`;
