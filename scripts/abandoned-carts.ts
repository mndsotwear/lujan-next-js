/**
 * پیامک یادآوری سبد رهاشده — برای cron روی سرور (هر ۳۰ دقیقه: npm run jobs:abandoned).
 * فقط مشتریان واردشده، ۳ ساعت پس از آخرین تغییر سبد، یک بار برای هر سبد، بین ۹ تا ۲۱ تهران.
 */
import "dotenv/config";
import { fa } from "../src/content/fa";
import { db } from "../src/lib/db";
import { getSmsSender } from "../src/modules/account/sms";
import {
  ABANDONED_AFTER_MS,
  ABANDONED_MAX_AGE_MS,
  reminderText,
  shouldRemind,
} from "../src/modules/cart/abandoned";

async function main() {
  const now = new Date();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const carts = await db.cart.findMany({
    where: {
      userId: { not: null },
      items: { some: { savedForLater: false } },
    },
    include: {
      user: { select: { id: true, mobile: true, name: true } },
      items: { where: { savedForLater: false }, select: { createdAt: true, updatedAt: true } },
    },
  });
  const sms = getSmsSender();
  let sent = 0;
  for (const c of carts) {
    if (!c.user) continue;
    const lastActivity = new Date(
      Math.max(
        c.updatedAt.getTime(),
        ...c.items.map((i) => Math.max(i.createdAt.getTime(), i.updatedAt.getTime())),
      ),
    );
    const age = now.getTime() - lastActivity.getTime();
    if (age < ABANDONED_AFTER_MS || age > ABANDONED_MAX_AGE_MS) continue;
    const orderedSince =
      (await db.order.count({
        where: { userId: c.user.id, createdAt: { gt: lastActivity } },
      })) > 0;
    const ok = shouldRemind(
      {
        hasUser: true,
        itemCount: c.items.length,
        lastActivity,
        remindedAt: c.remindedAt,
        orderedSince,
      },
      now,
    );
    if (!ok) continue;
    await sms.sendText(c.user.mobile, reminderText(fa.site.name, site, c.user.name));
    // updatedAt عوض نشود تا «آخرین تغییر» واقعی بماند
    await db.cart.update({
      where: { id: c.id },
      data: { remindedAt: now, updatedAt: c.updatedAt },
    });
    sent++;
  }
  console.log(`✓ ${sent} پیامک یادآوری سبد فرستاده شد.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
