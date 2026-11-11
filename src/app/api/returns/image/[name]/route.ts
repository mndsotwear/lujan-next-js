/** نمایش تصویر مرجوعی فقط به صاحب سفارش یا کارمند دارای مجوز مرجوعی (D-033) */
import { getCurrentUser } from "@/modules/account/server";
import { staffWith } from "@/modules/admin/server";
import { isSafeImageName } from "@/modules/returns";
import { readReturnImage, returnImageExists, userOwnsReturnImage } from "@/modules/returns/server";

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

async function allowed(name: string) {
  if (await staffWith("returns.manage")) return returnImageExists(name);
  const user = await getCurrentUser();
  return !!user && userOwnsReturnImage(user.id, name);
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isSafeImageName(name) || !(await allowed(name)))
    return new Response("Not found", { status: 404 });
  const file = await readReturnImage(name);
  if (!file) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop() as keyof typeof TYPES;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": TYPES[ext],
      "Cache-Control": "private, no-store", // پس از خروج روی دستگاه مشترک نماند
      "Content-Disposition": "inline",
    },
  });
}
