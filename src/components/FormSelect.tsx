"use client";
/**
 * <select> برای فرم‌هایی که با Server Action ارسال می‌شوند.
 * React 19 پس از هر ارسال فرم را reset می‌کند و select (برخلاف input) به گزینه‌ی اولیه برمی‌گردد؛
 * پس با یک خطای اعتبارسنجی، برند/وضعیت/دسته‌ی انتخاب‌شده بی‌صدا عوض می‌شد. این‌جا انتخاب فعلی پس از reset برمی‌گردد.
 */
import { useEffect, useRef, type ComponentProps } from "react";

export function FormSelect(props: ComponentProps<"select">) {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const el = ref.current;
    const form = el?.form;
    if (!el || !form) return;
    const onReset = () => {
      const keep = el.value;
      setTimeout(() => {
        if ([...el.options].some((o) => o.value === keep)) el.value = keep;
      }, 0);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  return <select ref={ref} {...props} />;
}
