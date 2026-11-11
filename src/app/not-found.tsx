import { NotFoundBody } from "@/components/NotFoundBody";
import { ShopChrome } from "@/components/layout/ShopChrome";

/** نشانی ناموجود در کل سایت — با قاب فروشگاه */
export default function NotFound() {
  return (
    <ShopChrome>
      <NotFoundBody />
    </ShopChrome>
  );
}
