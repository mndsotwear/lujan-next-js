// رابط عمومی ماژول پنل مدیریت (امن برای مرورگر). سرور: "./server"؛ Server Actionها: "./actions".
export { STAFF_ROLES, can, isStaffRole } from "./permissions";
export type { StaffRole, Permission } from "./permissions";
export type { LoginState, SetupState, StaffFormState } from "./actions";
export { REPORT_TABLES, buildTables } from "./report-tables";
export type { ReportTable, Table } from "./report-tables";
