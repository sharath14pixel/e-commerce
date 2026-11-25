import { SHOP_CONFIG } from "./data.js";
import { getProductById } from "./cart.js";

export const CART_STORAGE_KEY = "mini-shop:cart";
export const PREFS_STORAGE_KEY = "mini-shop:prefs";
export const REVIEWS_STORAGE_KEY = "mini-shop:reviews";

const memoryFallback = new Map();

/**
 * Safely read a raw string from localStorage, falling back to in-memory storage.
 *
 * @param {string} key - Storage key.
 * @returns {string|null} Stored string or null.
 */
function safeGetItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

/**
 * Safely write a raw string to localStorage, falling back to in-memory storage.
 *
 * @param {string} key - Storage key.
 * @param {string} value - Serialized string.
 */
function safeSetItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryFallback.set(key, value);
  }
}

/**
 * Validate and sanitize a parsed cart payload against the product catalogue.
 * Drops unknown ids, coerces quantities to positive integers, and clamps to maxQtyPerItem.
 *
 * @param {unknown} raw - Parsed JSON value.
 * @returns {Record<string, number>} Sanitized cart object.
 */
export function validateCartData(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return Object.entries(raw).reduce((acc, [id, qty]) => {
    const product = getProductById(id);
    if (!product) {
      return acc;
    }
    const parsedQty = Math.floor(Number(qty));
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return acc;
    }
    acc[String(product.id)] = Math.min(SHOP_CONFIG.maxQtyPerItem, parsedQty);
    return acc;
  }, {});
}

/**
 * Load and validate the cart from localStorage.
 * Returns an empty cart if JSON is missing or corrupted.
 *
 * @returns {Record<string, number>} Validated cart object.
 */
export function loadCart() {
  const raw = safeGetItem(CART_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return validateCartData(parsed);
  } catch {
    return {};
  }
}

/**
 * Persist the cart to localStorage.
 *
 * @param {Record<string, number>} cart - Cart object to save.
 */
export function saveCart(cart) {
  safeSetItem(CART_STORAGE_KEY, JSON.stringify(validateCartData(cart)));
}

/**
 * Load persisted UI preferences (coupon, theme, sort, category).
 *
 * @returns {{ coupon: string, theme: string, sort: string, category: string }} Preferences object.
 */
export function loadPrefs() {
  const defaults = {
    coupon: "",
    theme: "auto",
    sort: "featured",
    category: "All",
  };
  const raw = safeGetItem(PREFS_STORAGE_KEY);
  if (!raw) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return defaults;
    }
    return {
      coupon: typeof parsed.coupon === "string" ? parsed.coupon : "",
      theme: ["auto", "light", "dark"].includes(parsed.theme) ? parsed.theme : "auto",
      sort: ["featured", "price-asc", "price-desc", "name-asc"].includes(parsed.sort)
        ? parsed.sort
        : "featured",
      category: typeof parsed.category === "string" ? parsed.category : "All",
    };
  } catch {
    return defaults;
  }
}

/**
 * Persist UI preferences to localStorage.
 *
 * @param {{ coupon: string, theme: string, sort: string, category: string }} prefs - Preferences to save.
 */
export function savePrefs(prefs) {
  safeSetItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Load and validate user-submitted product reviews from localStorage.
 *
 * @returns {Record<string, Array<{ author: string, rating: number, comment: string, date: string }>>} Reviews map.
 */
export function loadReviews() {
  const raw = safeGetItem(REVIEWS_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce((acc, [id, list]) => {
      if (!getProductById(id) || !Array.isArray(list)) {
        return acc;
      }
      acc[id] = list
        .filter(
          (item) =>
            item &&
            typeof item.author === "string" &&
            typeof item.comment === "string" &&
            Number.isInteger(item.rating) &&
            item.rating >= 1 &&
            item.rating <= 5
        )
        .slice(0, 25);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

/**
 * Persist user-submitted product reviews to localStorage.
 *
 * @param {Record<string, Array<{ author: string, rating: number, comment: string, date: string }>>} reviews - Reviews map.
 */
export function saveReviews(reviews) {
  safeSetItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
}
