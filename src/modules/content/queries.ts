/** بنر و صفحه‌ی ثابت — فقط سرور */
import { db } from "@/lib/db";
import { activeBanners, type PageSlug } from "./rules";

export const listBanners = () =>
  db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });

/** برای صفحه‌ی اصلی؛ اگر جدول هنوز ساخته نشده، بدون بنر */
export async function getActiveBanners() {
  try {
    return activeBanners(await db.banner.findMany({ where: { isActive: true } }));
  } catch {
    return [];
  }
}

export async function getPage(slug: PageSlug) {
  try {
    return await db.page.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

export const listPages = () => db.page.findMany();
