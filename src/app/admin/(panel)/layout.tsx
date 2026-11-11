import Link from "next/link";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { fa } from "@/content/fa";
import { formatMobile } from "@/modules/account";
import { can, type Permission } from "@/modules/admin";
import { requireStaff } from "@/modules/admin/server";

export const dynamic = "force-dynamic";

const NAV: { key: keyof typeof fa.admin.nav; href: string; perm: Permission; ready: boolean }[] = [
  { key: "dashboard", href: "/admin", perm: "dashboard.view", ready: true },
  { key: "orders", href: "/admin/orders", perm: "orders.view", ready: true },
  { key: "returns", href: "/admin/returns", perm: "returns.manage", ready: true },
  { key: "inbox", href: "/admin/inbox", perm: "inbox.view", ready: true },
  { key: "products", href: "/admin/products", perm: "products.manage", ready: true },
  { key: "inventory", href: "/admin/inventory", perm: "inventory.manage", ready: true },
  { key: "customers", href: "/admin/customers", perm: "customers.manage", ready: true },
  { key: "marketing", href: "/admin/marketing", perm: "marketing.manage", ready: true },
  { key: "content", href: "/admin/content", perm: "content.manage", ready: true },
  { key: "reports", href: "/admin/reports", perm: "reports.view", ready: true },
  { key: "staff", href: "/admin/staff", perm: "staff.manage", ready: true },
  { key: "audit", href: "/admin/audit", perm: "audit.view", ready: true },
  { key: "backup", href: "/admin/backup", perm: "backup.manage", ready: true },
];

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const me = await requireStaff();
  const items: NavItem[] = NAV.filter((n) => can(me.role, n.perm)).map((n) => ({
    href: n.href,
    label: fa.admin.nav[n.key],
    ready: n.ready,
  }));
  return (
    <div className="min-h-dvh">
      <header className="border-line bg-surface sticky top-0 z-20 border-b">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-black">
            <span className="text-copper">لوجان</span> {fa.admin.title}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-2 max-sm:hidden">
              {me.name ?? formatMobile(me.mobile)} — {fa.admin.roles[me.role]}
            </span>
            <Link href="/" className="text-ink-2 underline max-sm:hidden">
              {fa.admin.storeLink}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="no-print bg-surface border-line rounded-sheet min-w-0 border p-2 lg:sticky lg:top-[84px] lg:self-start">
          <AdminNav items={items} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
