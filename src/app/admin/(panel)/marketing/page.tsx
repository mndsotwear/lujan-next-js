import type { Metadata } from "next";
import Link from "next/link";
import { BundleManager } from "@/components/admin/BundleManager";
import { CouponManager } from "@/components/admin/CouponManager";
import { DealManager } from "@/components/admin/DealManager";
import { listBundlesAdmin, listDealsAdmin } from "@/modules/promotions/server";
import { RuleManager } from "@/components/admin/RuleManager";
import { SynonymManager } from "@/components/admin/SynonymManager";
import { fa } from "@/content/fa";
import { formatJalaliInput } from "@/lib/jalali";
import { requireStaff } from "@/modules/admin/server";
import { listCoupons } from "@/modules/cart/server";
import { listRules, productOptions } from "@/modules/recommendations/server";
import { maskAddress } from "@/modules/newsletter";
import { recentSubscribers, subscriberStats } from "@/modules/newsletter/server";
import { DEFAULT_SYNONYMS } from "@/modules/search";
import { DownloadLink } from "@/components/admin/DownloadLink";
import { card } from "@/components/admin/ui";
import { listSynonyms, zeroResultQueries } from "@/modules/search/server";

export const metadata: Metadata = { title: fa.admin.marketing.title };

/** کد تخفیف، قانون پیشنهاد سبد و مترادف جستجو (FR-ADM-06) */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff("marketing.manage");
  const { tab: raw } = await searchParams;
  const TABS = ["coupons", "deals", "bundles", "rules", "synonyms", "newsletter"] as const;
  const tab = (TABS as readonly string[]).includes(raw ?? "")
    ? (raw as (typeof TABS)[number])
    : "coupons";
  const t = fa.admin.marketing;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <nav className="border-line flex gap-1 border-b">
        {TABS.map((k) => (
          <Link
            key={k}
            href={`?tab=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === k ? "border-copper font-bold" : "text-ink-2 border-transparent"}`}
          >
            {t.tabs[k]}
          </Link>
        ))}
      </nav>
      {tab === "coupons" && <Coupons />}
      {tab === "deals" && <Deals />}
      {tab === "bundles" && <Bundles />}
      {tab === "rules" && <Rules />}
      {tab === "synonyms" && <Synonyms />}
      {tab === "newsletter" && <Newsletter />}
    </div>
  );
}

async function Coupons() {
  const now = new Date();
  const rows = await listCoupons();
  return (
    <CouponManager
      coupons={rows.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value,
        minSubtotal: c.minSubtotal,
        maxDiscount: c.maxDiscount,
        usageLimit: c.usageLimit,
        perCustomerLimit: c.perCustomerLimit,
        startsAt: formatJalaliInput(c.startsAt),
        endsAt: formatJalaliInput(c.endsAt),
        isActive: c.isActive,
        used: c._count.orders,
        expired: !!c.endsAt && c.endsAt < now,
      }))}
    />
  );
}

async function Deals() {
  const now = new Date();
  const [rows, products] = await Promise.all([listDealsAdmin(), productOptions()]);
  return (
    <DealManager
      products={products}
      deals={rows.map((d) => ({
        id: d.id,
        productName: d.product.name,
        percent: d.percent,
        startsAt: formatJalaliInput(d.startsAt),
        endsAt: `${formatJalaliInput(d.endsAt)} ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" }).format(d.endsAt)}`,
        endsAtDate: formatJalaliInput(d.endsAt),
        endHour: String(
          Number(
            new Intl.DateTimeFormat("en-US", {
              timeZone: "Asia/Tehran",
              hour: "numeric",
              hourCycle: "h23",
            }).format(d.endsAt),
          ),
        ),
        isActive: d.isActive,
        state: !d.isActive
          ? ("off" as const)
          : d.endsAt <= now
            ? ("ended" as const)
            : d.startsAt && d.startsAt > now
              ? ("scheduled" as const)
              : ("live" as const),
      }))}
    />
  );
}

async function Bundles() {
  const [rows, products] = await Promise.all([listBundlesAdmin(), productOptions()]);
  return (
    <BundleManager
      products={products}
      bundles={rows.map((b) => ({
        id: b.id,
        title: b.title,
        percent: b.percent,
        productIds: b.productIds,
        isActive: b.isActive,
        sortOrder: b.sortOrder,
      }))}
    />
  );
}

async function Rules() {
  const [rules, products] = await Promise.all([listRules(), productOptions()]);
  return (
    <RuleManager
      products={products}
      rules={rules.map((r) => ({
        id: r.id,
        source: r.sourceProduct,
        target: r.targetProduct,
        type: r.type,
        reasonLabel: r.reasonLabel,
        priority: r.priority,
        isActive: r.isActive,
      }))}
    />
  );
}

async function Synonyms() {
  const [groups, zero] = await Promise.all([listSynonyms(), zeroResultQueries()]);
  return (
    <SynonymManager
      builtIn={DEFAULT_SYNONYMS}
      groups={groups.map((g) => ({ id: g.id, terms: g.terms, isActive: g.isActive }))}
      zero={zero}
    />
  );
}

/** خبرنامه: آمار، آخرین عضویت‌ها، خروجی برای سرویس ارسال (FR-MKT-01، D-055) */
async function Newsletter() {
  const t = fa.admin.marketing.newsletter;
  const [stats, rows] = await Promise.all([subscriberStats(), recentSubscribers()]);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(d);
  const stat = (label: string, n: number) => (
    <div className={`${card} p-4`}>
      <p className="text-steel text-sm">{label}</p>
      <p className="text-2xl font-bold">{n.toLocaleString("fa-IR")}</p>
    </div>
  );
  return (
    <div className="space-y-5">
      <p className="text-ink-2 max-w-[75ch] text-sm leading-7">{t.intro}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {stat(t.sms, stats.sms)}
        {stat(t.email, stats.email)}
        {stat(t.left, stats.unsubscribed)}
      </div>
      <DownloadLink href="/admin/marketing/subscribers/export">{t.export}</DownloadLink>
      <h2 className="font-bold">{t.recent}</h2>
      {rows.length === 0 ? (
        <p className="text-steel text-sm">{t.empty}</p>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="text-steel">
              <tr>
                {(["address", "channel", "source", "date", "state"] as const).map((k) => (
                  <th key={k} className="p-3 text-start font-normal">
                    {t.cols[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-line border-t">
                  <td dir="ltr" className="p-3 text-end">
                    {maskAddress(r)}
                  </td>
                  <td className="p-3">{r.channel === "SMS" ? t.sms : t.email}</td>
                  <td className="p-3">{t.sources[r.source] ?? r.source}</td>
                  <td className="p-3">{fmt(r.consentAt)}</td>
                  <td className={`p-3 ${r.unsubscribedAt ? "text-steel" : "text-ok"}`}>
                    {r.unsubscribedAt ? t.unsubscribed : t.active}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
