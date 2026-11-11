import Link from "next/link";
import { fa } from "@/content/fa";
import { specChips, type ProductSummary, type SpecSchema } from "@/modules/catalog";
import { ProductCard } from "../ProductCard";
import { Carousel } from "../ui/Carousel";

/** یک ردیف کروسل محصولات با عنوان و لینک «همه» (الگوی فروشگاه‌های بزرگ) */
export function ProductRail({
  title,
  href,
  products,
  schemaOf,
  tone = "plain",
  eyebrow,
}: {
  title: string;
  href?: string;
  products: ProductSummary[];
  schemaOf: Map<string, SpecSchema>;
  tone?: "plain" | "brand";
  eyebrow?: string;
}) {
  if (products.length === 0) return null;
  const brand = tone === "brand";
  return (
    <section
      className={
        brand
          ? "rounded-sheet from-copper bg-gradient-to-l to-[#0b2a6b] p-5 text-white sm:p-8"
          : "py-2"
      }
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <span
              className={`rounded-chip px-3 py-0.5 text-xs font-bold ${brand ? "bg-white/20" : "bg-copper-soft text-copper"}`}
            >
              {eyebrow}
            </span>
          )}
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            className={`shrink-0 text-sm font-bold hover:underline ${brand ? "text-white" : "text-copper"}`}
          >
            {fa.home.all} ‹
          </Link>
        )}
      </div>
      <Carousel label={title}>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            specChips={specChips(schemaOf.get(p.categorySlug) ?? [], p.specs, 2)}
          />
        ))}
      </Carousel>
    </section>
  );
}
