/** خواندن اطلاعات حساب (فقط سرور) */
import { db } from "@/lib/db";
import { openIban } from "./iban-store";

export async function getProfile(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const inv = (u.invoiceInfo ?? {}) as {
    companyName?: string | null;
    nationalId?: string | null;
    economicCode?: string | null;
  };
  return {
    name: u.name ?? "",
    email: u.email ?? "",
    refundIban: openIban(u.refundIban) ?? "",
    invoice: {
      companyName: inv.companyName ?? "",
      nationalId: inv.nationalId ?? "",
      economicCode: inv.economicCode ?? "",
    },
  };
}

export async function listAddresses(userId: string) {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function listOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}
