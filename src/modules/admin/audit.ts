/** ثبت حسابرسی عملیات مدیریتی (NFR-SEC-07، FR-ADM-10) — شکست ثبت، عملیات را متوقف نمی‌کند */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  diff?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({ data: { actorId, action, entity, entityId, diff } });
  } catch (e) {
    console.error("audit failed", action, e);
  }
}
