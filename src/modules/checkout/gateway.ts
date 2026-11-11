/**
 * درگاه پرداخت — لایه‌ی قابل تعویض (D-023) با PAYMENT_GATEWAY:
 * mock = صفحه‌ی /pay/mock با دکمه‌ی موفق/ناموفق (توسعه و آزمون)، zarinpal = درگاه واقعی (D-065، zarinpal.ts).
 * الگوی زرین‌پال: request ← کاربر به درگاه ← بازگشت به callback با Authority و Status ← verify.
 * هیچ اطلاعات کارتی در سایت دیده یا ذخیره نمی‌شود (NFR-SEC-03).
 */
import { randomBytes } from "node:crypto";
import { zarinpalGateway } from "./zarinpal";

export interface PaymentGateway {
  name: string;
  request(input: {
    amount: number;
    description: string;
    callbackUrl: string;
    mobile: string;
  }): Promise<{ authority: string; redirectUrl: string }>;
  verify(input: {
    authority: string;
    amount: number;
  }): Promise<{ ok: true; refId: string } | { ok: false; reason: string }>;
}

const mockGateway: PaymentGateway = {
  name: "mock",
  async request() {
    const authority = `MOCK-${randomBytes(9).toString("hex").toUpperCase()}`;
    return { authority, redirectUrl: `/pay/mock?authority=${authority}` };
  },
  async verify({ authority }) {
    // درگاه آزمایشی: اگر کاربر «موفق» زده باشد callback با Status=OK آمده؛ شماره‌ی مرجع ساختگی
    return { ok: true, refId: `${authority.slice(-6)}${Date.now().toString().slice(-6)}` };
  },
};

/**
 * name: برای بازگشت از درگاه همان درگاهی که پرداخت با آن شروع شده (payment.gateway)،
 * تا عوض شدن تنظیم در میانه‌ی یک پرداخت، تأیید آن را خراب نکند.
 */
export function getGateway(name = process.env.PAYMENT_GATEWAY ?? "mock"): PaymentGateway {
  if (name === "mock") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_GATEWAY !== "1")
      throw new Error("PAYMENT_GATEWAY در محیط تولید تنظیم نشده است (D-023).");
    return mockGateway;
  }
  if (name === "zarinpal")
    return zarinpalGateway({
      merchantId: process.env.ZARINPAL_MERCHANT_ID ?? "",
      sandbox: process.env.ZARINPAL_SANDBOX === "1",
    });
  throw new Error(`درگاه «${name}» پیاده نشده است.`);
}
