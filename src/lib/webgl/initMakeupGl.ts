// src/lib/webgl/initMakeupGl.ts
import { vertexShaderSource, fragmentShaderSource } from "./shader";

// twgl は dynamic import して SSR を回避
type TwglModule = typeof import("twgl.js");

export type MakeupGlContext = {
    gl: WebGL2RenderingContext;
    twgl: TwglModule;
    programInfo: any;
    bufferInfo: any;
    baseTexture: WebGLTexture;
    maskTexture: WebGLTexture;
    render: (params: {
        tintColor: [number, number, number, number];
        strength: number;
        textureType?: number; // 0: マット, 1: クリーム, 2: パウダー
    }) => void;
    updateMaskFromCanvas: (canvas: HTMLCanvasElement) => void;
};

export async function initMakeupGl(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    initialMaskCanvas?: HTMLCanvasElement
): Promise<MakeupGlContext> {
    // 1) WebGL2 コンテキスト取得
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        throw new Error("WebGL2 is not supported");
    }

    // 2) twgl をロード
    const twgl: TwglModule = await import("twgl.js");

    // 3) プログラム作成
    const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

    // 4) フルスクリーン用の頂点バッファ
    const arrays = {
        position: {
            numComponents: 2,
            data: [
                -1,
                -1, //
                1,
                -1,
                -1,
                1,
                -1,
                1,
                1,
                -1,
                1,
                1,
            ],
        },
        texcoord: {
            numComponents: 2,
            data: [
                0,
                0, //
                1,
                0,
                0,
                1,
                0,
                1,
                1,
                0,
                1,
                1,
            ],
        },
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    // 5) 顔写真テクスチャ
    const baseTexture = twgl.createTexture(gl, {
        src: image,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
    });

    // 6) マスク用テクスチャ（最初は真っ白 1x1 でもOK）
    const maskTexture = twgl.createTexture(gl, {
        src:
            initialMaskCanvas ??
            new Uint8Array([
                255,
                255,
                255,
                0, // RGBA (α=0)
            ]),
        width: initialMaskCanvas ? undefined : 1,
        height: initialMaskCanvas ? undefined : 1,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
    });

    // 7) マスク更新関数：Canvas2D で描いたマスクをそのまま転送
    const updateMaskFromCanvas = (maskCanvas: HTMLCanvasElement) => {
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    // 8) 描画関数
    const render = (params: {
        tintColor: [number, number, number, number];
        strength: number;
        textureType?: number;
    }) => {
        const { tintColor, strength, textureType = 0 } = params;

        // Canvas のサイズを CSS に合わせてリサイズ
        twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // 透明でクリア（重ね合わせを可能にする）
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // アルファブレンディングを有効化
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

        const uniforms = {
            uBaseTexture: baseTexture,
            uMaskTexture: maskTexture,
            uTintColor: tintColor,
            uStrength: strength,
            uTextureType: textureType,
        };

        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, bufferInfo);
    };

    return {
        gl,
        twgl,
        programInfo,
        bufferInfo,
        baseTexture,
        maskTexture,
        render,
        updateMaskFromCanvas,
    };
}
