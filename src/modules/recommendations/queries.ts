/** قوانین پیشنهاد برای پنل — فقط سرور */
import { db } from "@/lib/db";

export const listRules = () =>
  db.recommendationRule.findMany({
    orderBy: [{ sourceProduct: { name: "asc" } }, { priority: "desc" }],
    include: {
      sourceProduct: { select: { id: true, name: true } },
      targetProduct: { select: { id: true, name: true } },
    },
  });

export const productOptions = () =>
  db.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
