import type { Metadata } from "next";
import Link from "next/link";
import { AnswerForm, ReviewButtons } from "@/components/admin/InboxControls";
import { fa } from "@/content/fa";
import { formatOrderNumber } from "@/lib/format";
import { formatMobile } from "@/modules/account";
import { can } from "@/modules/admin";
import { requireStaff } from "@/modules/admin/server";
import { pendingQuestions, pendingReviews } from "@/modules/catalog/server";
import { pendingCancels } from "@/modules/checkout/server";
import { listReturnsAdmin } from "@/modules/returns/server";

export const metadata: Metadata = { title: fa.admin.inbox.title };

const date = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(
    d,
  );

/** صندوق ورودی مشترک: مرجوعی، پرسش و نظر (FR-ADM-08) */
export default async function InboxPage() {
  const me = await requireStaff("inbox.view");
  const t = fa.admin.inbox;
  const showReturns = can(me.role, "returns.manage");
  const showCancels = can(me.role, "orders.cancel");
  const [cancels, returns, questions, reviews] = await Promise.all([
    showCancels ? pendingCancels() : Promise.resolve([]),
    showReturns ? listReturnsAdmin("open") : Promise.resolve([]),
    pendingQuestions(),
    pendingReviews(),
  ]);
  const box = "rounded-card border-line bg-surface border p-5";
  const who = (u: { name: string | null; mobile: string } | null) =>
    u ? (u.name ?? formatMobile(u.mobile)) : "—";
  const heading = (title: string, n: number) => (
    <h2 className="mb-3 flex items-center gap-2 font-bold">
      {title}
      <span
        className={`rounded-chip px-2 text-xs ${n ? "bg-copper text-copper-ink" : "bg-surface-2"}`}
      >
        {n.toLocaleString("fa-IR")}
      </span>
    </h2>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-ink-2 text-sm">{t.intro}</p>

      {showCancels && (
        <section className={box}>
          {heading(t.cancels, cancels.length)}
          {cancels.length ? (
            <ul className="divide-line divide-y text-sm">
              {cancels.map((c) => (
                <li
                  key={c.number}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span>
                    #{formatOrderNumber(c.number)} — {c.cancelReason}
                    <small className="text-ink-2 ms-2">{who(c.user)}</small>
                  </span>
                  <Link href={`/admin/orders/${c.number}`} className="underline">
                    {t.open}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2 text-sm">{t.none}</p>
          )}
        </section>
      )}

      {showReturns && (
        <section className={box}>
          {heading(t.returns, returns.length)}
          {returns.length ? (
            <ul className="divide-line divide-y text-sm">
              {returns.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    #{formatOrderNumber(r.order.number)} — {fa.returns.types[r.type]}،{" "}
                    {fa.returns.reasons[r.reasonCode]}
                    <small className="text-ink-2 ms-2">{who(r.order.user)}</small>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={r.status === "REQUESTED" ? "text-copper" : "text-ink-2"}>
                      {fa.returns.status[r.status]}
                    </span>
                    <Link href={`/admin/returns/${r.id}`} className="underline">
                      {t.open}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2 text-sm">{t.none}</p>
          )}
        </section>
      )}

      <section className={box}>
        {heading(t.questions, questions.length)}
        {questions.length ? (
          <ul className="space-y-5">
            {questions.map((q) => (
              <li key={q.id} className="border-line border-b pb-5 last:border-0 last:pb-0">
                <p className="text-ink-2 mb-1 text-xs">
                  {t.on}{" "}
                  <Link
                    href={`/products/${q.product.slug}#qa`}
                    target="_blank"
                    className="underline"
                  >
                    {q.product.name}
                  </Link>{" "}
                  — {who(q.user)} — {date(q.createdAt)}
                </p>
                <p className="mb-2">{q.body}</p>
                <AnswerForm id={q.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2 text-sm">{t.none}</p>
        )}
      </section>

      <section className={box}>
        {heading(t.reviews, reviews.length)}
        {reviews.length ? (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-line border-b pb-4 last:border-0 last:pb-0">
                <p className="text-ink-2 mb-1 text-xs">
                  {t.on}{" "}
                  <Link href={`/products/${r.product.slug}`} target="_blank" className="underline">
                    {r.product.name}
                  </Link>{" "}
                  — {who(r.user)} {r.isVerified && `(${t.buyer})`} — {date(r.createdAt)}
                </p>
                <p className="mb-1 font-bold">{t.stars(r.rating)}</p>
                {r.body && <p className="mb-2">{r.body}</p>}
                <ReviewButtons id={r.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2 text-sm">{t.none}</p>
        )}
      </section>
    </div>
  );
}
