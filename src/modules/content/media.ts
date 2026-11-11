/** تصویر بنر روی دیسک سرور (D-045، D-048) — فقط سرور */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeImageName } from "@/modules/returns";

const dir = () =>
  path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage"), "banners");

export async function saveBannerImage(bytes: Uint8Array, ext: string): Promise<string> {
  await mkdir(dir(), { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir(), name), bytes, { flag: "wx" });
  return `/media/banners/${name}`;
}

export async function readBannerImage(name: string): Promise<Buffer | null> {
  if (!isSafeImageName(name)) return null;
  return readFile(path.join(dir(), name)).catch(() => null);
}

export async function removeBannerImage(url: string | null) {
  const name = url?.split("/").pop() ?? "";
  if (isSafeImageName(name)) await unlink(path.join(dir(), name)).catch(() => {});
}

// تصویر شاخص مقاله و صفحه‌ی فرود (D-053) — همان قاعده‌ی بنر، پوشه‌ی جدا
const contentDir = () =>
  path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage"), "content");

export async function saveContentImage(bytes: Uint8Array, ext: string): Promise<string> {
  await mkdir(contentDir(), { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(contentDir(), name), bytes, { flag: "wx" });
  return `/media/content/${name}`;
}

export async function readContentImage(name: string): Promise<Buffer | null> {
  if (!isSafeImageName(name)) return null;
  return readFile(path.join(contentDir(), name)).catch(() => null);
}

export async function removeContentImage(url: string | null) {
  const name = url?.split("/").pop() ?? "";
  if (isSafeImageName(name)) await unlink(path.join(contentDir(), name)).catch(() => {});
}
