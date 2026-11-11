/** کارت مقاله در فهرست مجله */
import Image from "next/image";
import Link from "next/link";
import { fa } from "@/content/fa";
import { readingMinutes } from "@/modules/content";
import { Icon } from "../Icon";

export const faDate = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(d);

export function PostCard({
  p,
}: {
  p: {
    slug: string;
    title: string;
    excerpt: string | null;
    section?: string;
    coverImage: string | null;
    coverAlt: string | null;
    publishedAt: Date | null;
    body?: string;
  };
}) {
  return (
    <article className="rounded-card border-line bg-surface group overflow-hidden border">
      <Link href={`/blog/${p.slug}`} className="block">
        <div className="bg-surface-2 relative aspect-[1200/630]">
          {p.coverImage ? (
            <Image
              src={p.coverImage}
              alt={p.coverAlt ?? ""}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              className="object-cover"
            />
          ) : (
            <div className="text-copper grid h-full place-items-center">
              <Icon name="tea" className="size-12" />
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-steel text-xs">
            {p.section ? `${fa.blog.sections[p.section] ?? ""} · ` : ""}
            {p.publishedAt ? faDate(p.publishedAt) : ""}
            {p.body ? ` · ${fa.blog.minutes(readingMinutes(p.body))}` : ""}
          </p>
          <h3 className="text-lg leading-8 font-bold group-hover:underline">{p.title}</h3>
          {p.excerpt && <p className="text-ink-2 line-clamp-3 text-sm leading-7">{p.excerpt}</p>}
        </div>
      </Link>
    </article>
  );
}
