/** قاب فروشگاه: سربرگ، فوتر، نوار پایین موبایل و سبد — برای همه‌ی صفحه‌های فروشگاه (نه پنل مدیریت) */
import { CartProvider } from "@/components/cart/CartProvider";
import { CartToast } from "@/components/cart/CartToast";
import { MiniCart } from "@/components/cart/MiniCart";
import { Analytics } from "../Analytics";
import { getCart } from "@/modules/cart/server";
import { MobileTabBar } from "./MobileTabBar";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export async function ShopChrome({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider initial={await getCart()}>
      <div className="min-h-dvh overflow-x-clip pb-[72px] lg:pb-0">
        <SiteHeader />
        {children}
        <SiteFooter />
        <MobileTabBar />
        <MiniCart />
        <CartToast />
      </div>
      <Analytics />
    </CartProvider>
  );
}
