/**
 * نقش‌ها و مجوزها (FR-ADM-10) — همین جدول در منو، صفحه و هر Server Action بررسی می‌شود.
 */
export type StaffRole = "ADMIN" | "OPERATOR" | "WAREHOUSE" | "CONTENT_MANAGER";
export const STAFF_ROLES: StaffRole[] = ["ADMIN", "OPERATOR", "WAREHOUSE", "CONTENT_MANAGER"];

export type Permission =
  | "dashboard.view"
  | "orders.view"
  | "orders.manage"
  | "orders.cancel"
  | "returns.manage"
  | "inbox.view"
  | "products.manage"
  | "products.price"
  | "inventory.manage"
  | "customers.manage"
  | "marketing.manage"
  | "content.manage"
  | "reports.view"
  | "staff.manage"
  | "audit.view"
  | "backup.manage";

const ALL: Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.cancel",
  "returns.manage",
  "inbox.view",
  "products.manage",
  "products.price",
  "inventory.manage",
  "customers.manage",
  "marketing.manage",
  "content.manage",
  "reports.view",
  "staff.manage",
  "audit.view",
  "backup.manage",
];

const GRANTS: Record<StaffRole, Permission[]> = {
  /** مدیر کل؛ لغو سفارش (D-039) و تغییر قیمت (D-042) فقط با او */
  ADMIN: ALL,
  /** اپراتور: سفارش، مرجوعی، صندوق ورودی، مشتری، تخفیف */
  OPERATOR: [
    "dashboard.view",
    "orders.view",
    "orders.manage",
    "returns.manage",
    "inbox.view",
    "customers.manage",
    "marketing.manage",
    "reports.view",
  ],
  /** انباردار: موجودی و آماده‌سازی و ارسال سفارش */
  WAREHOUSE: ["dashboard.view", "orders.view", "orders.manage", "inventory.manage"],
  /** مدیر محتوا: محصول، دسته، بنر، صفحات، مترادف و قانون پیشنهاد */
  CONTENT_MANAGER: [
    "dashboard.view",
    "products.manage",
    "content.manage",
    "marketing.manage",
    "inbox.view",
  ],
};

export const isStaffRole = (role: string): role is StaffRole =>
  (STAFF_ROLES as string[]).includes(role);

export const can = (role: string, p: Permission) => isStaffRole(role) && GRANTS[role].includes(p);
