// src/lib/onnxRuntime.ts
import * as ort from "onnxruntime-web";

let inited = false;

// ONNX Runtime の警告メッセージを抑制
const originalWarn = console.warn;
const originalError = console.error;

function filterOnnxLogs() {
    console.warn = (...args: any[]) => {
        const message = args.join(" ");
        // ONNX Runtime の CPU vendor 警告を除外
        if (
            message.includes("Unknown CPU vendor") ||
            message.includes("cpuid_info.cc") ||
            message.includes("LogEarlyWarning")
        ) {
            return;
        }
        originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
        const message = args.join(" ");
        // ONNX Runtime の不要なエラーメッセージを除外
        if (message.includes("Unknown CPU vendor") || message.includes("cpuid_info.cc")) {
            return;
        }
        originalError.apply(console, args);
    };
}

export async function initOrt() {
    if (inited) return;

    // ログフィルタリングを開始
    filterOnnxLogs();

    // ONNX Runtime の設定
    // @ts-ignore
    ort.env.wasm.numThreads = 1;
    // @ts-ignore - ログレベルを設定して警告を抑制
    if (ort.env.logLevel !== undefined) {
        // @ts-ignore
        ort.env.logLevel = "error"; // 'verbose', 'info', 'warning', 'error', 'fatal'
    }

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
                logSeverityLevel: 3, // 0=verbose, 1=info, 2=warning, 3=error, 4=fatal
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
