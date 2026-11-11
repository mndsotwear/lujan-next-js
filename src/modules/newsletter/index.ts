// رابط عمومی ماژول خبرنامه (امن برای مرورگر). سرور: "./server"؛ Server Action: "./actions".
export {
  isOptOutText,
  maskAddress,
  normalizeEmail,
  parseContact,
  SMS_OPT_OUT_FOOTER,
} from "./rules";
export type { Channel, Contact } from "./rules";
