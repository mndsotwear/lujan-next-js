/**
 * ساخت اولین مدیر کل روی سرور تازه (داده‌ی نمونه روی سرور اصلی اجرا نمی‌شود):
 *   npm run admin:create -- 09121234567 "نام و نام خانوادگی"
 * سپس همان شخص در /admin/activate با کد پیامکی، رمز و تأیید دومرحله‌ای فعال می‌شود (D-022).
 * مدیرهای بعدی و بقیه‌ی کارکنان از پنل → کارکنان اضافه می‌شوند.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { normalizeMobile } from "../src/modules/account/mobile";

async function main() {
  const mobile = normalizeMobile(process.argv[2] ?? "");
  const name = (process.argv[3] ?? "").trim();
  if (!mobile || name.length < 2) {
    console.error('استفاده: npm run admin:create -- 09121234567 "نام"');
    process.exitCode = 1;
    return;
  }
  const user = await db.user.upsert({
    where: { mobile },
    update: { role: "ADMIN", staffDisabledAt: null },
    create: { mobile, name, role: "ADMIN" },
  });
  await db.auditLog
    .create({
      data: {
        actorId: null,
        action: "staff.add",
        entity: "user",
        entityId: user.id,
        diff: { role: "ADMIN", mobile, via: "cli" },
      },
    })
    .catch(() => undefined);
  console.log(
    `✓ ${mobile} مدیر کل شد. فعال‌سازی: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/activate`,
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
