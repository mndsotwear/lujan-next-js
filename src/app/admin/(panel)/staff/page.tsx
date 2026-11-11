import type { Metadata } from "next";
import { StaffManager } from "@/components/admin/StaffManager";
import { fa } from "@/content/fa";
import { listStaff, requireStaff } from "@/modules/admin/server";

export const metadata: Metadata = { title: fa.admin.staff.title };

/** کارکنان و نقش‌ها (FR-ADM-10) */
export default async function StaffPage() {
  const me = await requireStaff("staff.manage");
  const staff = await listStaff();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{fa.admin.staff.title}</h1>
      <p className="text-ink-2 text-sm">{fa.admin.staff.intro}</p>
      <StaffManager
        meId={me.id}
        staff={staff.map((s) => ({
          id: s.id,
          mobile: s.mobile,
          name: s.name,
          role: s.role,
          state: s.staffDisabledAt ? "disabled" : s.totpEnabledAt ? "active" : "pending",
          locked: !!s.lockedUntil && s.lockedUntil > new Date(),
          lastLogin: s.lastLogin?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
