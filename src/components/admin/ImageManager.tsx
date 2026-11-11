"use client";
/** تصویرهای محصول: بارگذاری یکی‌یکی، ترتیب، متن جایگزین، حذف (FR-ADM-01، D-045) */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fa } from "@/content/fa";
import {
  deleteProductImage,
  updateProductImages,
  uploadProductImage,
} from "@/modules/catalog/admin-actions";
import { btnGhost, btnPrimary, inputCls } from "./ui";

type Img = { id: string; url: string; alt: string };
const t = fa.admin.catalog;

export function ImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const [list, setList] = useState(images);
  const [prev, setPrev] = useState(images);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, start] = useTransition();
  // پس از refresh صفحه، فهرست تازه‌ی سرور جایگزین می‌شود
  if (prev !== images) {
    setPrev(images);
    setList(images);
  }

  async function upload(files: FileList) {
    const all = Array.from(files);
    let last: { ok: boolean; message: string } = { ok: true, message: t.saved };
    for (const [i, file] of all.entries()) {
      setProgress(t.images.uploading(i + 1, all.length));
      const f = new FormData();
      f.set("productId", productId);
      f.set("file", file);
      last = await uploadProductImage(f).catch(() => ({
        ok: false,
        message: fa.cart.errors.network,
      }));
      if (!last.ok) break;
    }
    setProgress(null);
    setMsg(last);
    router.refresh();
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setList(next);
  };

  return (
    <div className="space-y-4">
      {list.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((img, i) => (
            <li key={img.id} className="rounded-ctl border-line space-y-2 border p-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش پنل */}
                <img
                  src={img.url}
                  alt={img.alt}
                  className="rounded-ctl aspect-square w-full bg-white object-contain"
                />
                {i === 0 && (
                  <span className="rounded-chip bg-copper text-copper-ink absolute start-2 top-2 px-2 text-xs">
                    {t.images.main}
                  </span>
                )}
              </div>
              <label className="sr-only" htmlFor={`alt-${img.id}`}>
                {t.images.alt}
              </label>
              <input
                id={`alt-${img.id}`}
                value={img.alt}
                placeholder={t.images.alt}
                onChange={(e) =>
                  setList(list.map((x) => (x.id === img.id ? { ...x, alt: e.target.value } : x)))
                }
                className={`${inputCls} min-h-10 text-sm`}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className={btnGhost}
                >
                  {t.images.up}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === list.length - 1}
                  className={btnGhost}
                >
                  {t.images.down}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(t.images.confirmRemove)) return;
                    start(async () => {
                      setMsg(await deleteProductImage(img.id));
                      router.refresh();
                    });
                  }}
                  className={`${btnGhost} text-bad ms-auto`}
                >
                  {t.images.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2 text-sm">{t.images.none}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${btnPrimary} inline-grid cursor-pointer place-items-center`}>
          {t.images.add}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {list.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                setMsg(
                  await updateProductImages(
                    productId,
                    list.map(({ id, alt }) => ({ id, alt })),
                  ),
                );
                router.refresh();
              })
            }
            className={btnGhost}
          >
            {t.images.saveOrder}
          </button>
        )}
        <span
          role="status"
          className={`text-sm ${progress ? "text-ink-2" : msg?.ok ? "text-ok" : "text-bad"}`}
        >
          {progress ?? msg?.message ?? ""}
        </span>
      </div>
      <p className="text-steel text-xs">{t.images.hint}</p>
    </div>
  );
}
