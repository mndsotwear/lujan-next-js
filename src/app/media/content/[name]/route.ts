/** تصویر شاخص مقاله و صفحه‌ی فرود (D-053) — نام تصادفی، کش بلندمدت */
import { readContentImage } from "@/modules/content/server";
import { isSafeImageName } from "@/modules/returns";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isSafeImageName(name)) return new Response("Not found", { status: 404 });
  const file = await readContentImage(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": TYPES[name.split(".").pop() as keyof typeof TYPES],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
