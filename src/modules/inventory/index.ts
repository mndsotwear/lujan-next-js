// رابط عمومی ماژول موجودی (امن برای مرورگر). سرور: "./server"؛ Server Actionها: "./actions".
export {
  ADJUST_REASONS,
  validateAdjustment,
  signedDelta,
  isLowStock,
  lowStockChanges,
  becameAvailable,
} from "./rules";
export type { AdjustReason, AdjustError } from "./rules";
