"use client";
/**
 * React 19 بعد از هر Server Action فرم را reset می‌کند؛ select کنترل‌شده در DOM به گزینه‌ی اول برمی‌گردد
 * ولی state همان می‌ماند، و ارسال بعدی مقدار اشتباه می‌فرستد. یک رندر دوباره پس از هر نتیجه، DOM را با state هم‌خوان می‌کند.
 */
import { useEffect, useReducer } from "react";

export function useResyncAfterAction(state: unknown): void {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (state) bump();
  }, [state]);
}
