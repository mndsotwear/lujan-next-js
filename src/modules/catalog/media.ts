/**
 * تصویر محصول روی دیسک سرور (D-045) — فقط سرور.
 * پوشه‌ی public در زمان اجرا پس از ساخت سرو نمی‌شود، پس تصویرها از مسیر /media/products/<نام> خوانده می‌شوند.
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeImageName } from "@/modules/returns";

const dir = () =>
  path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage"), "products");

export const PRODUCT_IMAGE_MAX = 8 * 1024 * 1024;

export async function saveProductImage(bytes: Uint8Array, ext: string): Promise<string> {
  await mkdir(dir(), { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir(), name), bytes, { flag: "wx" });
  return name;
}

export async function readProductImage(name: string): Promise<Buffer | null> {
  if (!isSafeImageName(name)) return null;
  return readFile(path.join(dir(), name)).catch(() => null);
}

export async function removeProductImage(name: string) {
  if (isSafeImageName(name)) await unlink(path.join(dir(), name)).catch(() => {});
}

export const productImageUrl = (name: string) => `/media/products/${name}`;
export const nameFromUrl = (url: string) => url.split("/").pop() ?? "";
