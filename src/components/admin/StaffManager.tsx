"use client";
/** فهرست و مدیریت کارکنان (FR-ADM-10) */
import { useActionState, useState, useTransition } from "react";
import { fa } from "@/content/fa";
import { formatMobile } from "@/modules/account";
import { STAFF_ROLES, type StaffRole } from "@/modules/admin";
import {
  addStaff,
  changeStaffRole,
  resetStaffAccess,
  setStaffDisabled,
} from "@/modules/admin/actions";
import { btnGhost, btnPrimary, card, inputCls } from "./ui";
import { FormSelect } from "@/components/FormSelect";

type Row = {
  id: string;
  mobile: string;
  name: string | null;
  role: string;
  state: "active" | "pending" | "disabled";
  locked: boolean;
  lastLogin: string | null;
};

const date = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

export function StaffManager({ meId, staff }: { meId: string; staff: Row[] }) {
  const t = fa.admin.staff;
  const [state, action, pending] = useActionState(addStaff, null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string } | null>) =>
    start(async () => setMsg(await fn()));

  return (
    <div className="space-y-5">
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-line text-steel border-b">
              <th className="p-3 text-start font-medium">{t.name}</th>
              <th className="p-3 text-start font-medium">{t.role}</th>
              <th className="p-3 text-start font-medium">{t.status}</th>
              <th className="p-3 text-start font-medium">{t.lastLogin}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const self = s.id === meId;
              return (
                <tr key={s.id} className="border-line border-b last:border-0">
                  <td className="p-3">
                    <b>{s.name ?? "—"}</b>
                    {self && <small className="text-copper ms-2">({t.you})</small>}
                    <span className="text-ink-2 block">{formatMobile(s.mobile)}</span>
                  </td>
                  <td className="p-3">
                    <label className="sr-only" htmlFor={`role-${s.id}`}>
                      {t.changeRole}
                    </label>
                    <FormSelect
                      id={`role-${s.id}`}
                      defaultValue={s.role}
                      disabled={self || busy}
                      onChange={(e) => run(() => changeStaffRole(s.id, e.target.value))}
                      className={`${inputCls} min-h-10 w-auto`}
                    >
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {fa.admin.roles[r]}
                        </option>
                      ))}
                    </FormSelect>
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        s.state === "active"
                          ? "text-ok"
                          : s.state === "disabled"
                            ? "text-bad"
                            : "text-copper"
                      }
                    >
                      {t[s.state]}
                    </span>
                    {s.locked && <small className="text-bad block">🔒</small>}
                  </td>
                  <td className="text-ink-2 p-3">{s.lastLogin ? date(s.lastLogin) : t.never}</td>
                  <td className="p-3">
                    {!self && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => setStaffDisabled(s.id, s.state !== "disabled"))}
                          className={btnGhost}
                        >
                          {s.state === "disabled" ? t.enable : t.disable}
                        </button>
                        {s.state === "active" && (
                          <button
                            type="button"
                            disabled={busy}
                            title={t.resetHint}
                            onClick={() => {
                              if (window.confirm(t.confirmReset)) run(() => resetStaffAccess(s.id));
                            }}
                            className={btnGhost}
                          >
                            {t.reset}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p role="status" className={`min-h-5 text-sm ${msg?.ok ? "text-ok" : "text-bad"}`}>
        {msg?.message ?? ""}
      </p>

      <form
        action={action}
        className={`${card} grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end`}
      >
        <h2 className="font-bold md:col-span-4">{t.add}</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="st-mobile" className="text-sm font-medium">
            {t.mobile}
          </label>
          <input
            id="st-mobile"
            name="mobile"
            inputMode="numeric"
            required
            dir="ltr"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="st-name" className="text-sm font-medium">
            {t.name}
          </label>
          <input id="st-name" name="name" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="st-role" className="text-sm font-medium">
            {t.role}
          </label>
          <FormSelect id="st-role" name="role" defaultValue="OPERATOR" className={inputCls}>
            {STAFF_ROLES.map((r: StaffRole) => (
              <option key={r} value={r}>
                {fa.admin.roles[r]}
              </option>
            ))}
          </FormSelect>
        </div>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {t.save}
        </button>
        <p role="status" className={`text-sm md:col-span-4 ${state?.ok ? "text-ok" : "text-bad"}`}>
          {state?.message ?? ""}
        </p>
      </form>
    </div>
  );
}
