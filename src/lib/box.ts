/** رمزنگاری مقدار حساس (TOTP، شبا) در پایگاه داده (NFR-SEC-06): AES-256-GCM با کلید مشتق از AUTH_SECRET */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const key = (secret: string, purpose: string) =>
  createHash("sha256").update(`${purpose}:${secret}`).digest();

export function seal(plain: string, secret: string, purpose = "totp"): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret, purpose), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${enc.toString("base64")}`;
}

export function open(sealed: string, secret: string, purpose = "totp"): string | null {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(secret, purpose), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
