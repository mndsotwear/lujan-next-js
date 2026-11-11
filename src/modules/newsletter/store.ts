/** ثبت و لغو رضایت در پایگاه داده — فقط سرور */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Contact } from "./rules";

const newToken = () => randomBytes(18).toString("base64url");

/** عضویت یا عضویت دوباره (رضایت تازه ثبت می‌شود) */
export async function optIn(c: Contact, source: string, userId?: string | null) {
  const where = { channel_address: { channel: c.channel, address: c.address } };
  const old = await db.subscriber.findUnique({ where });
  if (old) {
    if (!old.unsubscribedAt && (old.userId || !userId)) return old;
    return db.subscriber.update({
      where,
      data: {
        unsubscribedAt: null,
        ...(old.unsubscribedAt ? { consentAt: new Date(), source } : {}),
        ...(userId && !old.userId ? { userId } : {}),
      },
    });
  }
  return db.subscriber.create({
    data: { ...c, source, userId: userId ?? null, token: newToken() },
  });
}

export async function optOut(c: Contact): Promise<boolean> {
  const r = await db.subscriber.updateMany({
    where: { channel: c.channel, address: c.address, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  return r.count > 0;
}
