/** فایل‌های استوری روی دیسک سرور — فقط سرور (مثل بنرها، پوشه‌ی جدا) */
import { randomBytes } from "node:crypto";
import { mkdir, open, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeStoryName, type StoryExt } from "./rules";

const dir = () =>
  path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage"), "stories");

export async function saveStoryMedia(bytes: Uint8Array, ext: StoryExt): Promise<string> {
  await mkdir(dir(), { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir(), name), bytes, { flag: "wx" });
  return `/media/stories/${name}`;
}

export async function removeStoryMedia(url: string | null | undefined) {
  const name = url?.split("/").pop() ?? "";
  if (isSafeStoryName(name)) await unlink(path.join(dir(), name)).catch(() => {});
}

/** اندازه‌ی فایل برای پاسخ Range */
export async function storyMediaSize(name: string): Promise<number | null> {
  if (!isSafeStoryName(name)) return null;
  return stat(path.join(dir(), name))
    .then((s) => (s.isFile() ? s.size : null))
    .catch(() => null);
}

/** خواندن بخشی از فایل (یا کل آن) */
export async function readStoryMedia(
  name: string,
  start: number,
  end: number,
): Promise<Uint8Array | null> {
  if (!isSafeStoryName(name)) return null;
  const fh = await open(path.join(dir(), name), "r").catch(() => null);
  if (!fh) return null;
  try {
    const buf = new Uint8Array(end - start + 1);
    await fh.read(buf, 0, buf.length, start);
    return buf;
  } finally {
    await fh.close();
  }
}
