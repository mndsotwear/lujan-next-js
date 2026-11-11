/**
 * متن پیامک کد ورود (D-022 بند ۵) — منطق خالص.
 * خط آخر «@دامنه #کد» قالب WebOTP است: کروم اندروید و سافاری کد را خودکار پیشنهاد می‌دهند
 * و فقط روی همین دامنه؛ پس کد در سایت جعلی پر نمی‌شود.
 */
export function otpMessage(code: string, siteName: string, siteUrl: string): string {
  let host = "";
  try {
    host = new URL(siteUrl).hostname;
  } catch {
    host = "";
  }
  return [
    `کد ورود ${siteName}: ${code}`,
    "این کد را به هیچ‌کس ندهید؛ ما هرگز آن را تلفنی یا در پیام نمی‌پرسیم.",
    ...(host && host !== "localhost" ? ["", `@${host} #${code}`] : []),
  ].join("\n");
}
