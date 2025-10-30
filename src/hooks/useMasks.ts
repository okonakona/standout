// src/hooks/useMasks.ts
"use client";
import { useEffect, useState } from "react";
import type { PartMasks } from "@/lib/faceParsing";
import { getFacePartMasks } from "@/lib/faceParsing";

export function useMasks(image: HTMLImageElement | null) {
    const [masks, setMasks] = useState<PartMasks | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!image) return;
            setLoading(true);
            setError(null);
            try {
                const res = await getFacePartMasks(image);
                if (!cancelled) setMasks(res);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "mask error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [image]);

    return { masks, loading, error };
}
