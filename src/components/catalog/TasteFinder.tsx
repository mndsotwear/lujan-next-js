/**
 * فرم «طعم‌یاب»: دکمه‌های طعم (چندانتخابی)، متن آزاد و دسته — فرم GET، بدون نیاز به جاوااسکریپت.
 */
import { fa } from "@/content/fa";
import { FLAVORS } from "@/modules/catalog/flavors";

export function TasteFinder({
  picked = [],
  q = "",
  category = "",
  categories,
  compact = false,
}: {
  picked?: string[];
  q?: string;
  category?: string;
  categories: { slug: string; name: string }[];
  compact?: boolean;
}) {
  const t = fa.taste;
  return (
    <form action="/taste" method="get" className="space-y-4">
      <fieldset>
        <legend className={`mb-3 font-bold ${compact ? "text-sm" : ""}`}>{t.pick}</legend>
        <div className="flex flex-wrap gap-2">
          {FLAVORS.map((f) => (
            <label key={f.slug} className="cursor-pointer">
              <input
                type="checkbox"
                name="f"
                value={f.slug}
                defaultChecked={picked.includes(f.slug)}
                className="peer sr-only"
              />
              <span className="border-line bg-surface text-ink peer-checked:border-copper peer-checked:bg-copper peer-checked:text-copper-ink peer-focus-visible:ring-copper hover:border-copper inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors select-none peer-focus-visible:ring-2">
                <span aria-hidden>{f.emoji}</span>
                {f.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-ink-2 text-xs">{t.textLabel}</span>
          <input
            name="q"
            defaultValue={q}
            maxLength={120}
            placeholder={t.textPlaceholder}
            className="rounded-ctl border-line bg-surface min-h-11 border px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-2 text-xs">{t.categoryLabel}</span>
          <select
            name="c"
            defaultValue={category}
            className="rounded-ctl border-line bg-surface min-h-11 border px-3 text-sm"
          >
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-ctl bg-copper text-copper-ink min-h-11 self-end px-6 text-sm font-bold hover:brightness-110"
        >
          {t.submit}
        </button>
      </div>
    </form>
  );
}
