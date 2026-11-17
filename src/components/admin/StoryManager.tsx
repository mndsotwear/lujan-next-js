"use client";
/** استوری‌های صفحه‌ی اصلی: ساخت استوری (عنوان و عکس دایره) و افزودن اسلاید عکس یا ویدیو */
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import {
  addStorySlide,
  deleteStory,
  deleteStorySlide,
  moveStorySlide,
  saveStory,
} from "@/modules/stories/actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

export type StoryRow = {
  id: string;
  title: string;
  cover: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
  live: boolean;
  slides: {
    id: string;
    kind: string;
    url: string;
    ctaLabel: string | null;
    ctaLink: string | null;
  }[];
};
const t = fa.admin.content.stories;

function Field({
  id,
  name,
  label,
  defaultValue,
  ltr = false,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        dir={ltr ? "ltr" : undefined}
        className={`${inputCls} min-h-10 text-sm`}
      />
    </div>
  );
}

function StoryForm({ s, onDone }: { s?: StoryRow; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveStory, null);
  const v = state?.values;
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, onDone, router]);
  const id = s?.id ?? "n";
  const val = (k: keyof StoryRow & string) => v?.[k] ?? (s ? String(s[k] ?? "") : "");
  return (
    <form action={action} className="space-y-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`st-${id}-title`} name="title" label={t.title} defaultValue={val("title")} />
        <div className="flex flex-col gap-1">
          <label htmlFor={`st-${id}-cover`} className="text-xs font-medium">
            {t.cover}
          </label>
          <input
            id={`st-${id}-cover`}
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
          />
          <small className="text-steel text-[11px]">{s ? t.keepCover : t.coverHint}</small>
        </div>
        <Field
          id={`st-${id}-startsAt`}
          name="startsAt"
          label={t.startsAt}
          defaultValue={val("startsAt")}
          ltr
        />
        <Field
          id={`st-${id}-endsAt`}
          name="endsAt"
          label={t.endsAt}
          defaultValue={val("endsAt")}
          ltr
        />
        <Field
          id={`st-${id}-sortOrder`}
          name="sortOrder"
          label={t.sortOrder}
          defaultValue={val("sortOrder") || "0"}
          ltr
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={v ? v.isActive === "on" : (s?.isActive ?? true)}
            className="accent-copper size-4"
          />
          {t.isActive}
        </label>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.saving : t.save}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          {t.cancel}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state && !state.ok ? state.message : ""}
        </span>
      </div>
    </form>
  );
}

function SlideForm({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addStorySlide, null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      const r = setTimeout(() => setKey((k) => k + 1), 0); // خالی کردن فرم
      return () => clearTimeout(r);
    }
  }, [state, router]);
  const v = state && !state.ok ? state.values : undefined;
  return (
    <form
      key={key}
      action={action}
      className="rounded-ctl border-line space-y-3 border border-dashed p-3"
    >
      <input type="hidden" name="storyId" value={storyId} />
      <b className="block text-sm">{t.addSlide}</b>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`sl-${storyId}-file`} className="text-xs font-medium">
            {t.file}
          </label>
          <input
            id={`sl-${storyId}-file`}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            className="text-sm"
          />
          <small className="text-steel text-[11px]">{t.fileHint}</small>
        </div>
        <Field
          id={`sl-${storyId}-ctaLabel`}
          name="ctaLabel"
          label={t.ctaLabel}
          defaultValue={v?.ctaLabel ?? ""}
        />
        <Field
          id={`sl-${storyId}-ctaLink`}
          name="ctaLink"
          label={t.ctaLink}
          defaultValue={v?.ctaLink ?? ""}
          ltr
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? t.uploading : t.upload}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}

export function StoryManager({ stories }: { stories: StoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const done = () => setEditing(null);
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <p className="text-ink-2 text-sm">{t.intro}</p>
      {editing === "new" ? (
        <div className={`${card} p-4`}>
          <StoryForm onDone={done} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          {t.new}
        </button>
      )}
      {stories.length === 0 && <p className="text-ink-2 text-sm">{t.empty}</p>}
      {stories.map((s) => (
        <div key={s.id} className={`${card} space-y-4 p-4`}>
          {editing === s.id ? (
            <StoryForm s={s} onDone={done} />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش پنل */}
              <img src={s.cover} alt="" className="size-14 rounded-full object-cover" />
              <div className="min-w-0 text-sm">
                <b>{s.title}</b>
                <span className="text-ink-2 block">{t.slidesCount(s.slides.length)}</span>
                <span className={s.live ? "text-ok" : "text-steel"}>
                  {s.live ? t.live : s.slides.length ? t.scheduled : t.noSlides}
                </span>
              </div>
              <span className="ms-auto flex gap-2">
                <button type="button" onClick={() => setEditing(s.id)} className={btnGhost}>
                  {t.edit}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.confirmRemove)) act(() => deleteStory(s.id));
                  }}
                  className={`${btnGhost} text-bad`}
                >
                  {t.remove}
                </button>
              </span>
            </div>
          )}

          {s.slides.length > 0 && (
            <ol className="flex gap-3 overflow-x-auto pb-1">
              {s.slides.map((x, i) => (
                <li key={x.id} className="w-28 shrink-0 space-y-1 text-xs">
                  <div className="rounded-ctl bg-surface-2 relative aspect-[9/16] overflow-hidden">
                    {x.kind === "video" ? (
                      <video
                        src={x.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="size-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش پنل
                      <img src={x.url} alt="" className="size-full object-cover" />
                    )}
                    <span className="absolute start-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] text-white">
                      {(i + 1).toLocaleString("fa-IR")} · {x.kind === "video" ? t.video : t.image}
                    </span>
                  </div>
                  {x.ctaLink && (
                    <span className="text-ink-2 block truncate" dir="ltr" title={x.ctaLink}>
                      {x.ctaLabel} → {x.ctaLink}
                    </span>
                  )}
                  <span className="flex justify-between gap-1">
                    <button
                      type="button"
                      disabled={busy || i === 0}
                      onClick={() => act(() => moveStorySlide(x.id, -1))}
                      aria-label={t.moveUp}
                      className="text-ink-2 disabled:opacity-30"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t.confirmRemoveSlide)) act(() => deleteStorySlide(x.id));
                      }}
                      className="text-bad"
                    >
                      {t.remove}
                    </button>
                    <button
                      type="button"
                      disabled={busy || i === s.slides.length - 1}
                      onClick={() => act(() => moveStorySlide(x.id, 1))}
                      aria-label={t.moveDown}
                      className="text-ink-2 disabled:opacity-30"
                    >
                      ←
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <SlideForm storyId={s.id} />
        </div>
      ))}
    </div>
  );
}
