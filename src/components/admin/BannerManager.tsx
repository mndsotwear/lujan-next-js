"use client";
/** بنرهای صفحه‌ی اصلی (D-048) */
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { deleteBanner, saveBanner } from "@/modules/content/actions";
import { BANNER_PLACEMENTS } from "@/modules/content/rules";
import { FormSelect } from "@/components/FormSelect";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  alt: string;
  placement: string;
  imageDesktop: string;
  imageMobile: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
  live: boolean;
};
const t = fa.admin.content.banners;

function BannerForm({ b, onDone }: { b?: BannerRow; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBanner, null);
  const v = state?.values;
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      if (!b) onDone();
    }
  }, [state, b, onDone, router]);
  const id = b?.id ?? "n";
  const f = (name: keyof BannerRow & string, label: string, ltr = false) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`bn-${id}-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`bn-${id}-${name}`}
        name={name}
        defaultValue={v?.[name] ?? (b ? String(b[name] ?? "") : "")}
        dir={ltr ? "ltr" : undefined}
        className={`${inputCls} min-h-10 text-sm`}
      />
    </div>
  );
  const file = (name: "imageDesktop" | "imageMobile", label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`bn-${id}-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`bn-${id}-${name}`}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="text-sm"
      />
      {b && <small className="text-steel text-[11px]">{t.keepImage}</small>}
    </div>
  );
  return (
    <form action={action} className="space-y-3">
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={`bn-${id}-placement`} className="text-xs font-medium">
            {t.placement}
          </label>
          <FormSelect
            id={`bn-${id}-placement`}
            name="placement"
            defaultValue={v?.placement ?? b?.placement ?? "hero"}
            className={`${inputCls} min-h-10 text-sm`}
          >
            {BANNER_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {t.placements[p]}
              </option>
            ))}
          </FormSelect>
          <small className="text-steel text-[11px]">{t.placementHint}</small>
        </div>
        {f("title", t.title)}
        {f("subtitle", t.subtitle)}
        {f("link", t.link, true)}
        {f("alt", t.alt)}
        {file("imageDesktop", t.imageDesktop)}
        {file("imageMobile", t.imageMobile)}
        {f("startsAt", t.startsAt, true)}
        {f("endsAt", t.endsAt, true)}
        {f("sortOrder", t.sortOrder, true)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={v ? v.isActive === "on" : (b?.isActive ?? true)}
            className="accent-copper size-4"
          />
          {t.isActive}
        </label>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {t.save}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          {t.cancel}
        </button>
        <span role="status" className={`text-sm ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </span>
      </div>
    </form>
  );
}

export function BannerManager({ banners }: { banners: BannerRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const done = () => setEditing(null);
  return (
    <div className="space-y-3">
      <p className="text-ink-2 text-sm">{t.intro}</p>
      {editing === "new" ? (
        <div className={`${card} p-4`}>
          <BannerForm onDone={done} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          {t.new}
        </button>
      )}
      {banners.length === 0 && <p className="text-ink-2 text-sm">{t.empty}</p>}
      {banners.map((b) => (
        <div key={b.id} className={`${card} p-4`}>
          {editing === b.id ? (
            <BannerForm b={b} onDone={done} />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش پنل */}
              <img
                src={b.imageDesktop}
                alt={b.alt}
                className="rounded-ctl h-16 w-40 object-cover"
              />
              <div className="min-w-0 text-sm">
                <span className="bg-copper-soft text-copper me-2 rounded-full px-2 py-0.5 text-[11px] font-bold">
                  {t.placements[b.placement as keyof typeof t.placements] ?? t.placements.hero}
                </span>
                <b>{b.title}</b>
                {b.subtitle && <span className="text-ink-2 block">{b.subtitle}</span>}
                <span className={b.live ? "text-ok" : "text-steel"}>
                  {b.live ? t.live : t.scheduled}
                </span>
              </div>
              <span className="ms-auto flex gap-2">
                <button type="button" onClick={() => setEditing(b.id)} className={btnGhost}>
                  {t.edit}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.confirmRemove))
                      start(async () => {
                        await deleteBanner(b.id);
                        router.refresh();
                      });
                  }}
                  className={`${btnGhost} text-bad`}
                >
                  {t.remove}
                </button>
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
