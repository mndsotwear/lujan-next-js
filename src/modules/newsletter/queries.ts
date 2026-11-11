/** خبرنامه برای حساب و پنل — فقط سرور */
import { db } from "@/lib/db";

export async function consentsFor(user: { mobile: string; email: string | null }) {
  const rows = await db.subscriber.findMany({
    where: {
      unsubscribedAt: null,
      OR: [
        { channel: "SMS", address: user.mobile },
        ...(user.email ? [{ channel: "EMAIL" as const, address: user.email.toLowerCase() }] : []),
      ],
    },
    select: { channel: true },
  });
  return {
    sms: rows.some((r) => r.channel === "SMS"),
    email: rows.some((r) => r.channel === "EMAIL"),
  };
}

export const getSubscriberByToken = (token: string) =>
  db.subscriber.findUnique({
    where: { token },
    select: { channel: true, address: true, unsubscribedAt: true },
  });

export async function subscriberStats() {
  const groups = await db.subscriber.groupBy({
    by: ["channel"],
    where: { unsubscribedAt: null },
    _count: { _all: true },
  });
  const left = await db.subscriber.count({ where: { unsubscribedAt: { not: null } } });
  const n = (c: "SMS" | "EMAIL") => groups.find((g) => g.channel === c)?._count._all ?? 0;
  return { sms: n("SMS"), email: n("EMAIL"), unsubscribed: left };
}

export const recentSubscribers = (take = 30) =>
  db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take });

/** فهرست فعال برای ارسال در سرویس پیامک/ایمیل */
export const activeSubscribers = () =>
  db.subscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { consentAt: "asc" },
    select: { channel: true, address: true, consentAt: true, source: true, token: true },
  });
