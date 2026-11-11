/** ذخیره و خواندن رمزنگاری‌شده‌ی شبا (D-041) — فقط سرور */
import { open, seal } from "@/lib/box";
import { authSecret } from "./secret";

export const sealIban = (iban: string) => seal(iban, authSecret(), "iban");
export const openIban = (sealed: string | null | undefined) =>
  sealed ? open(sealed, authSecret(), "iban") : null;
