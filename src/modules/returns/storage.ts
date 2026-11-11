/** ذخیره‌ی تصویر مرجوعی روی دیسک سرور (D-033) — فقط سرور */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeImageName } from "./policy";

const dir = () =>
  path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage"), "returns");

export async function saveReturnImage(bytes: Uint8Array, ext: string): Promise<string> {
  await mkdir(dir(), { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir(), name), bytes, { flag: "wx" });
  return name;
}

export async function readReturnImage(name: string): Promise<Buffer | null> {
  if (!isSafeImageName(name)) return null;
  return readFile(path.join(dir(), name)).catch(() => null);
}
