"use client";
import { useRouter } from "next/navigation";
import { fa } from "@/content/fa";
import { adminLogout } from "@/modules/admin/actions";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await adminLogout();
        router.replace("/admin/login");
        router.refresh();
      }}
      className="rounded-ctl border-line border-[1.5px] px-3 py-1.5 font-medium"
    >
      {fa.admin.logout}
    </button>
  );
}
