/** فایل‌های استوری (عکس و ویدیو) — نام تصادفی، کش بلندمدت، پشتیبانی از Range برای ویدیو */
import { readStoryMedia, storyMediaSize } from "@/modules/stories/server";
import { isSafeStoryName, parseRange } from "@/modules/stories/rules";

const TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isSafeStoryName(name)) return new Response("Not found", { status: 404 });
  const size = await storyMediaSize(name);
  if (size === null) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": TYPES[name.split(".").pop() as keyof typeof TYPES],
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };
  const rangeHeader = req.headers.get("range");
  const range = parseRange(rangeHeader, size);
  if (rangeHeader && !range)
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const { start, end } = range ?? { start: 0, end: size - 1 };
  const body = await readStoryMedia(name, start, end);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body as unknown as BodyInit, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      "Content-Length": String(body.length),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}
