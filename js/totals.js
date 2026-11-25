import { SHOP_CONFIG } from "./data.js";
import { getProductById } from "./cart.js";

/**
 * Format a numeric amount in INR using Indian locale conventions.
 * Whole numbers omit decimal places; fractional values show 2 decimals.
 *
 * @param {number} amount - Numeric monetary amount.
 * @returns {string} Formatted currency string (e.g., "₹500", "₹1,250", "₹108.50").
 */
export function formatMoney(amount) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const isWhole = Number.isInteger(safeAmount);
  return safeAmount.toLocaleString(SHOP_CONFIG.locale, {
    style: "currency",
    currency: SHOP_CONFIG.currency,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  });
}

/**
 * Round a number to 2 decimal places to prevent floating-point drift.
 *
 * @param {number} value - Number to round.
 * @returns {number} Rounded number.
 */
function roundTwoDecimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Validate a coupon code against the current subtotal.
 *
 * @param {string} rawCode - User-entered coupon code.
 * @param {number} subtotal - Current cart subtotal in INR.
 * @returns {{ valid: boolean, code: string, discount: number, message: string }} Validation result.
 */
export function validateCoupon(rawCode, subtotal) {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!code) {
    return { valid: false, code: "", discount: 0, message: "" };
  }

  const rule = SHOP_CONFIG.coupons[code];
  if (!rule) {
    return {
      valid: false,
      code,
      discount: 0,
      message: `Coupon "${code}" is not valid.`,
    };
  }

  if (subtotal <= 0) {
    return {
      valid: false,
      code,
      discount: 0,
      message: "Add items to your cart before applying a coupon.",
    };
  }

  if (typeof rule.minSubtotal === "number" && subtotal < rule.minSubtotal) {
    return {
      valid: false,
      code,
      discount: 0,
      message: `${code} requires a minimum subtotal of ${formatMoney(rule.minSubtotal)}.`,
    };
  }

  const rawDiscount =
    rule.type === "percent" ? subtotal * (rule.value / 100) : rule.value;
  const discount = Math.min(subtotal, roundTwoDecimals(rawDiscount));

  return {
    valid: true,
    code,
    discount,
    message: `${code} applied: ${formatMoney(discount)} off.`,
  };
}

/**
 * Compute cart item count, subtotal, discount, delivery fee, and grand total.
 * Delivery is ₹40 when 0 < subtotal < ₹500, and ₹0 otherwise.
 *
 * @param {Record<string, number>} cart - Cart map keyed by product id string.
 * @param {string} [couponCode=""] - Optional coupon code.
 * @returns {{
 *   itemCount: number,
 *   subtotal: number,
 *   discount: number,
 *   delivery: number,
 *   total: number,
 *   couponResult: { valid: boolean, code: string, discount: number, message: string }
 * }} Calculated order summary.
 */
export function totals(cart, couponCode = "") {
  const summary = Object.entries(cart).reduce(
    (acc, [id, qty]) => {
      const product = getProductById(id);
      if (!product || !Number.isInteger(qty) || qty <= 0) {
        return acc;
      }
      acc.itemCount += qty;
      acc.subtotal = roundTwoDecimals(acc.subtotal + product.price * qty);
      return acc;
    },
    { itemCount: 0, subtotal: 0 }
  );

  const couponResult = validateCoupon(couponCode, summary.subtotal);
  const discount = couponResult.valid ? couponResult.discount : 0;

  const delivery =
    summary.subtotal > 0 && summary.subtotal < SHOP_CONFIG.freeDeliveryThreshold
      ? SHOP_CONFIG.deliveryFee
      : 0;

  const total = Math.max(
    0,
    roundTwoDecimals(summary.subtotal - discount + delivery)
  );

  return {
    itemCount: summary.itemCount,
    subtotal: summary.subtotal,
    discount,
    delivery,
    total,
    couponResult,
  };
}
