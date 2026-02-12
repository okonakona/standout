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

// セッションキャッシュでメモリリークを防ぐ
const sessionCache = new Map<string, ort.InferenceSession>();

export async function createSession(modelUrl: string) {
    await initOrt();

    // キャッシュされたセッションを再利用
    if (sessionCache.has(modelUrl)) {
        console.log("[onnxRuntime] Using cached session for:", modelUrl);
        return sessionCache.get(modelUrl)!;
    }

    const providers = ["webgpu", "webgl", "wasm"] as const;
    let lastError: any = null;

    for (const ep of providers) {
        try {
            console.log(`[onnxRuntime] Trying provider: ${ep}`);
            // @ts-ignore
            const session = await ort.InferenceSession.create(modelUrl, {
                executionProviders: [ep],
                logSeverityLevel: 3, // 0=verbose, 1=info, 2=warning, 3=error, 4=fatal
            });
            console.log(
                `[onnxRuntime] ✅ Successfully loaded with ${ep}`,
                "inputs:",
                session.inputNames,
                "outputs:",
                session.outputNames,
            );

            // キャッシュに保存
            sessionCache.set(modelUrl, session);
            return session;
        } catch (e) {
            lastError = e;
            console.warn(`[onnxRuntime] Failed with ${ep}:`, e);
            // 次の EP にフォールバック
        }
    }

    console.error("[onnxRuntime] ❌ All providers failed. Last error:", lastError);
    throw new Error(`Failed to create ONNX session: ${lastError?.message || "Unknown error"}`);
}
