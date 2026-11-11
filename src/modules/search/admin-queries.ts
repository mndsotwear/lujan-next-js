/** مترادف‌ها و جستجوهای بی‌نتیجه برای پنل (FR-SRCH-03, FR-SRCH-05) — فقط سرور */
import { db } from "@/lib/db";

export const listSynonyms = () => db.searchSynonym.findMany({ orderBy: { createdAt: "desc" } });

/** پرتکرارترین جستجوهای بی‌نتیجه‌ی ۳۰ روز اخیر — منبع خوبِ مترادف تازه یا کالای تازه */
export async function zeroResultQueries(limit = 30) {
  const rows = await db.searchQueryLog.groupBy({
    by: ["query"],
    where: { resultCount: 0, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _count: { query: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ query: r.query, count: r._count._all, last: r._max.createdAt }));
}
