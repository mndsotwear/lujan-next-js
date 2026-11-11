"use client";
import Link from "next/link";
import { useState } from "react";
import { fa } from "@/content/fa";

type Opt = { value: string; label: string };
const job: Opt[] = [
  { value: "instant-coffee", label: fa.home.finderHair },
  { value: "tea", label: fa.home.finderTea },
  { value: "korean-noodles", label: fa.home.finderNoodle },
  { value: "snacks", label: fa.home.finderBeard },
  { value: "syrup", label: fa.home.finderLine },
  { value: "olive-oil", label: fa.home.finderOlive },
];
const budget: Opt[] = [
  { value: "300000", label: fa.home.finderB3 },
  { value: "1000000", label: fa.home.finderB5 },
  { value: "", label: fa.home.finderBAny },
];

function Group({
  legend,
  name,
  opts,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  opts: Opt[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <label key={o.value} className="relative">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer absolute opacity-0"
            />
            <span className="rounded-ctl border-line bg-surface peer-checked:border-copper peer-checked:bg-copper peer-checked:text-copper-ink block min-h-11 cursor-pointer border-[1.5px] px-4 py-2 text-sm leading-[26px] peer-checked:font-bold peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-copper)_45%,transparent)]">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** یابنده‌ی دو‌انتخابی صفحه اصلی — به صفحه‌ی دسته با فیلتر قیمت و موجودی می‌رود. ورودی آینده‌ی دستیار هوشمند. */
export function Finder() {
  const [j, setJ] = useState("instant-coffee");
  const [b, setB] = useState("1000000");
  const q = new URLSearchParams();
  q.set("instock", "1");
  if (b) q.set("max", b);
  const href = `/categories/${j}?${q.toString()}`;
  return (
    <div>
      <Group legend={fa.home.finderJob} name="job" opts={job} value={j} onChange={setJ} />
      <Group legend={fa.home.finderBudget} name="budget" opts={budget} value={b} onChange={setB} />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={href}
          className="rounded-ctl bg-copper text-copper-ink grid min-h-12 place-items-center px-5 font-bold"
        >
          {fa.home.finderCta}
        </Link>
        <Link
          href="/categories/instant-coffee"
          className="text-copper text-sm font-medium hover:underline"
        >
          {fa.home.finderAll}
        </Link>
      </div>
    </div>
  );
}
