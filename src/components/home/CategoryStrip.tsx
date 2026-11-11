import Link from "next/link";
import { Icon } from "../Icon";

const TINTS = [
  "bg-[#e3edff] text-[#1d5fd8]",
  "bg-[#ffe9d6] text-[#c2570c]",
  "bg-[#dcf5e6] text-[#1f7a4d]",
  "bg-[#fde2e2] text-[#b3362b]",
  "bg-[#efe3ff] text-[#7a3fd1]",
  "bg-[#fff3c9] text-[#946a00]",
];

/** دایره‌های رنگی دسته‌ها زیر اسلایدر (مثل دیجی‌کالا و آمازون) */
export function CategoryStrip({
  categories,
}: {
  categories: { slug: string; name: string; icon: string; productCount: number }[];
}) {
  return (
    <nav aria-label="دسته‌ها">
      <ul className="flex snap-x [scrollbar-width:none] justify-between gap-4 overflow-x-auto py-2 max-md:justify-start [&::-webkit-scrollbar]:hidden">
        {categories.map((c, i) => (
          <li key={c.slug} className="shrink-0 snap-start">
            <Link
              href={`/categories/${c.slug}`}
              className="group flex w-[92px] flex-col items-center gap-2 text-center sm:w-[110px]"
            >
              <span
                className={`shadow-card grid size-[76px] place-items-center rounded-full transition-transform group-hover:-translate-y-1 sm:size-[92px] ${TINTS[i % TINTS.length]}`}
              >
                <Icon name={c.icon} className="size-9 sm:size-11" />
              </span>
              <span className="text-[13px] leading-snug font-bold sm:text-sm">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
