"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedSave(
  saveFn: () => Promise<void>,
  delay = 800,
  onError?: () => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    saveFnRef.current = saveFn;
    onErrorRef.current = onError;
  });

  const debouncedSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // L-006: catch promise rejections from debounced saves
      saveFnRef.current().catch(() => {
        onErrorRef.current?.();
      });
    }, delay);
  }, [delay]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await saveFnRef.current();
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { debouncedSave, flush, cancel };
}
