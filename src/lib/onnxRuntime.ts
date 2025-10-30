// src/lib/onnxRuntime.ts
import * as ort from "onnxruntime-web";

let inited = false;

export async function initOrt() {
    if (inited) return;
    // 必要なら WASM パスやスレッド数を設定
    // @ts-ignore
    ort.env.wasm.numThreads = 1;
    inited = true;
}

export async function createSession(modelUrl: string) {
    await initOrt();
    const providers = ["webgpu", "webgl", "wasm"] as const;
    for (const ep of providers) {
        try {
            // @ts-ignore
            const session = await ort.InferenceSession.create(modelUrl, {
                executionProviders: [ep],
            });
            // ★ 初回だけ入出力名をログ出し（コンソールで確認して控える）
            console.log(
                "[faceParsing] provider:",
                ep,
                "inputs:",
                session.inputNames,
                "outputs:",
                session.outputNames
            );
            return session;
        } catch (e) {
            // 次の EP にフォールバック
        }
    }
    throw new Error("Failed to create ONNX session");
}
