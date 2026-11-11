/** بارگذاری محصولات و مترادف‌ها در Meilisearch — اجرا: npm run search:sync (فقط وقتی MEILI_URL تنظیم شده). */
import "dotenv/config";
import { db } from "../src/lib/db";
import { getSearchSyncData, meiliEnabled, meiliSync } from "../src/modules/search/server";

async function main() {
  if (!meiliEnabled()) {
    console.log(
      "MEILI_URL تنظیم نشده؛ سایت از موتور جستجوی داخلی استفاده می‌کند. چیزی برای همگام‌سازی نیست.",
    );
    return;
  }
  const { docs, groups } = await getSearchSyncData();
  await meiliSync(docs, groups);
  console.log(`✓ ${docs.length} محصول و ${groups.length} گروه مترادف به Meilisearch فرستاده شد.`);
}
main()
  .catch((e) => {
    console.error("SYNC_FAIL", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
