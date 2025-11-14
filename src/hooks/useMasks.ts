import { useEffect, useState } from "react";
import { buildClipMasksFromLandmarks } from "@/lib/faceLandmarks";

type MasksOut = {
    faceClipMask: HTMLCanvasElement | null;
    eyeHoleMask: HTMLCanvasElement | null;
};

export function useMasks(img: HTMLImageElement | null) {
    const [masks, setMasks] = useState<MasksOut | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!img) {
            setMasks(null);
            setLoading(false);
            setErr(null);
            return;
        }

        (async () => {
            setLoading(true);
            setErr(null);

            try {
                console.log("[useMasks] 🎭 Starting face analysis...");

                // 画像が完全にロードされるまで待機
                if (!img.complete) {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error("Image loading timeout"));
                        }, 10000); // 10秒でタイムアウト

                        img.onload = () => {
                            clearTimeout(timeout);
                            resolve(void 0);
                        };
                        img.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error("Image loading failed"));
                        };
                    });
                }

                const { faceClipMask, eyeHoleMask } = await buildClipMasksFromLandmarks(img);

                if (!cancelled) {
                    console.log("[useMasks] ✨ Face analysis completed successfully");
                    setMasks({ faceClipMask, eyeHoleMask });
                }
            } catch (e: any) {
                console.warn("[useMasks] Face analysis failed, using fallback mode:", e);
                if (!cancelled) {
                    const errorMessage = e?.message || String(e);

                    // MediaPipe初期化失敗の場合は警告レベルに下げる
                    if (
                        errorMessage.includes("FaceLandmarker initialization failed") ||
                        errorMessage.includes("MediaPipe not available")
                    ) {
                        console.log("[useMasks] 🆓 Running in Free Paint Mode");
                        setErr(null); // エラーとして表示しない
                    } else {
                        setErr(`顔認識処理中にエラーが発生しましたが、基本機能は使用できます`);
                    }

                    // フォールバックマスクを作成（常に成功させる）
                    try {
                        const w = img.naturalWidth || img.width || 640;
                        const h = img.naturalHeight || img.height || 480;

                        // 全体を許可する白いマスク
                        const faceCanvas = document.createElement("canvas");
                        faceCanvas.width = w;
                        faceCanvas.height = h;
                        const faceCtx = faceCanvas.getContext("2d")!;
                        faceCtx.fillStyle = "#fff";
                        faceCtx.fillRect(0, 0, w, h);

                        // 空の目マスク（何も制限しない）
                        const eyeCanvas = document.createElement("canvas");
                        eyeCanvas.width = w;
                        eyeCanvas.height = h;

                        setMasks({
                            faceClipMask: faceCanvas, // 画面全体を塗り可能に
                            eyeHoleMask: eyeCanvas, // 目の制限なし
                        });

                        console.log("[useMasks] 🎨 Free Paint Mode enabled - paint anywhere!");
                    } catch (fallbackError) {
                        console.error(
                            "[useMasks] Critical error: Fallback mask creation failed:",
                            fallbackError
                        );
                        // 最後の手段として null を設定
                        setMasks({ faceClipMask: null, eyeHoleMask: null });
                        setErr("顔認識機能が利用できませんが、ブラシ機能は制限付きで使用可能です");
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [img]);

    return { masks, loading, error };
}
