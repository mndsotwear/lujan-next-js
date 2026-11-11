import { describe, expect, it } from "vitest";
import { buildCsp, originOf } from "./csp";

describe("CSP (D-060)", () => {
  it("اسکریپت فقط با nonce؛ بدون unsafe-inline و eval در تولید", () => {
    const csp = buildCsp({ nonce: "abc", dev: false, upgrade: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("حالت توسعه: eval و websocket برای بارگذاری مجدد", () => {
    const csp = buildCsp({ nonce: "n", dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(buildCsp({ nonce: "n", dev: false, upgrade: false })).not.toContain("upgrade");
  });

  it("Umami و درگاه فقط اگر تنظیم شده باشند", () => {
    const csp = buildCsp({
      nonce: "n",
      dev: false,
      analyticsOrigin: originOf("https://stats.example.ir/x"),
      paymentOrigins: ["https://www.zarinpal.com"],
    });
    expect(csp).toContain("connect-src 'self' https://stats.example.ir");
    expect(csp).toContain("form-action 'self' https://www.zarinpal.com");
    expect(originOf("javascript:alert(1)")).toBeNull();
    expect(originOf("")).toBeNull();
  });
});
