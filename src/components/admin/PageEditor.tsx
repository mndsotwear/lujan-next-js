"use client";
/** متن صفحه‌های ثابت (D-036، D-044) */
import Link from "next/link";
import { useActionState, useState } from "react";
import { fa } from "@/content/fa";
import { savePage } from "@/modules/content/actions";
import { RichText } from "../RichText";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

export function PageEditor({ slug, title, body }: { slug: string; title: string; body: string }) {
  const t = fa.admin.content.pages;
  const [state, action, pending] = useActionState(savePage, null);
  const [text, setText] = useState(body);
  const [preview, setPreview] = useState(false);
  return (
    <form action={action} className={`${card} space-y-3 p-5`}>
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{t.names[slug]}</h2>
        <Link href={`/${slug}`} target="_blank" className="text-copper text-sm underline">
          {t.view}
        </Link>
      </div>
      <label htmlFor={`pg-${slug}-title`} className="text-xs font-medium">
        {t.title}
      </label>
      <input
        id={`pg-${slug}-title`}
        name="title"
        defaultValue={state?.values?.title ?? title}
        className={inputCls}
      />
      <div className="flex items-center justify-between">
        <label htmlFor={`pg-${slug}-body`} className="text-xs font-medium">
          {t.body}
        </label>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          className={btnGhost}
        >
          {fa.admin.catalog.preview}
        </button>
      </div>
      <textarea
        id={`pg-${slug}-body`}
        name="body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className={`${inputCls} py-2 leading-7 ${preview ? "hidden" : ""}`}
      />
      {preview && <RichText text={text} className="rounded-ctl bg-surface-2/50 p-4" />}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {t.save}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}
