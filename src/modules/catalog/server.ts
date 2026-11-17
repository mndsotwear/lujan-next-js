// رابط سمت سرور ماژول کاتالوگ — فقط در Server Component، Route Handler و Server Action import شود.
import { cachedCatalog } from "@/lib/cache";
import * as q from "./queries";

export {
  getSearchDocuments,
  getProductSummaries,
  getWishlist,
  wishlistCount,
  getFeedProducts,
} from "./queries";

// پرس‌وجوهای صفحه‌های فروشگاه با کش (D-016): هر تغییر پنل بی‌درنگ، وگرنه حداکثر ۶۰ ثانیه
const navCategories = cachedCatalog("nav-categories", q.getNavCategories);
export const getCategoryWithProducts = cachedCatalog("category", q.getCategoryWithProducts);
export const getBestsellers = cachedCatalog("bestsellers", q.getBestsellers);
export const getTasteProducts = cachedCatalog("taste", q.getTasteProducts);
export const getNewest = cachedCatalog("newest", q.getNewest);
export const getDiscounted = cachedCatalog("discounted", q.getDiscounted);
export const getProductPage = cachedCatalog("product-page", q.getProductPage);
const megaMenu = cachedCatalog("mega-menu", q.getMegaMenu);

/** مگامنو؛ اگر پایگاه داده در دسترس نبود، منوی خالی (سربرگ نباید صفحه را از کار بیندازد) */
export async function getMegaMenu() {
  try {
    return await megaMenu();
  } catch (e) {
    console.error("getMegaMenu failed", e);
    return [];
  }
}

/** اگر پایگاه داده در دسترس نبود (مثلاً هنگام build در Docker)، منو خالی و بدون کش */
export async function getNavCategories() {
  try {
    return await navCategories();
  } catch (e) {
    console.error("getNavCategories failed", e);
    return [];
  }
}
export type { ProductPageData, VariantView } from "./queries";
export { requestStockNotification } from "./actions";
export { pendingQuestions, pendingReviews } from "./admin-queries";
export {
  listProductsAdmin,
  getProductAdmin,
  listCategoriesAdmin,
  listBrandsAdmin,
  getCategoryAdmin,
} from "./admin-queries";
export type { AdminProduct, ProductFilters } from "./admin-queries";
export { readProductImage, productImageUrl } from "./media";
