// رابط عمومی ماژول کاتالوگ (امن برای مرورگر و سرور). دسترسی به پایگاه داده از "./server".
export { SPEC_SCHEMAS, validateSpecs, formatSpecValue, specChips } from "./specs";
export type { SpecField, SpecSchema, SpecValues } from "./specs";
export { availableQty, stockState } from "./stock";
export type { StockState } from "./stock";
export type { ProductSummary, CategoryInfo } from "./types";
export { buildMegaMenu } from "./mega-menu";
export type { MegaCategory, MegaGroup, MegaLink, MegaBrand, MegaFeatured } from "./mega-menu";
export { applyListing, parseListingParams, toQueryString, SORT_KEYS, PAGE_SIZE } from "./listing";
export type { ListingParams, ListingResult, Facet, FacetOption, SortKey } from "./listing";
export type { NotifyState } from "./actions";
export { validQuestion, validReview, addRating } from "./feedback";
export type { FeedbackState } from "./feedback-actions";
export {
  validSlug,
  normalizeSlug,
  normalizeSku,
  suggestSku,
  validSku,
  parseAmount,
  validatePrices,
  parseAttributes,
  formatAttributes,
  parseTags,
  parseSpecForm,
  validateSpecSchema,
  parseRichText,
  richTextPlain,
} from "./admin-rules";
export type { Block, Inline, PriceErrors, SpecSchemaError } from "./admin-rules";
export {
  IMPORT_COLUMNS,
  PRICE_KEYS,
  planImport,
  summarizePlan,
  toRawRows,
  mapHeaders,
} from "./import-rules";
export type { ImportKey, PlanRow, RawRow, Change } from "./import-rules";
