import { products, SHOP_CONFIG } from "./data.js";

/**
 * Look up a product by its unique numeric id.
 *
 * @param {number|string} id - Product identifier.
 * @returns {object|undefined} Matching product object or undefined if not found.
 */
export function getProductById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return undefined;
  }
  return products.find((product) => product.id === numericId);
}

/**
 * Add one unit of a product to the cart, capped at SHOP_CONFIG.maxQtyPerItem.
 *
 * @param {Record<string, number>} cart - Current cart map keyed by product id string.
 * @param {number|string} id - Product identifier to add.
 * @returns {Record<string, number>} New cart object.
 */
export function addToCart(cart, id) {
  return changeQuantity(cart, id, 1);
}

/**
 * Adjust the quantity of a product in the cart by a finite integer delta.
 * Removes the item if the resulting quantity is 0 or less, and caps at maxQtyPerItem.
 * Unknown product ids or non-integer deltas are safely ignored.
 *
 * @param {Record<string, number>} cart - Current cart map keyed by product id string.
 * @param {number|string} id - Product identifier.
 * @param {number} delta - Finite integer change in quantity.
 * @returns {Record<string, number>} New cart object.
 */
export function changeQuantity(cart, id, delta) {
  const product = getProductById(id);
  if (!product || !Number.isInteger(delta) || !Number.isFinite(delta)) {
    return { ...cart };
  }

  const key = String(product.id);
  const currentQty = Number.isInteger(cart[key]) && cart[key] > 0 ? cart[key] : 0;
  const nextQty = Math.min(SHOP_CONFIG.maxQtyPerItem, currentQty + delta);

  const nextCart = { ...cart };
  if (nextQty <= 0) {
    delete nextCart[key];
  } else {
    nextCart[key] = nextQty;
  }
  return nextCart;
}

/**
 * Remove a product completely from the cart.
 *
 * @param {Record<string, number>} cart - Current cart map keyed by product id string.
 * @param {number|string} id - Product identifier to remove.
 * @returns {Record<string, number>} New cart object without the item.
 */
export function removeItem(cart, id) {
  const key = String(id);
  if (!Object.prototype.hasOwnProperty.call(cart, key)) {
    return { ...cart };
  }
  const nextCart = { ...cart };
  delete nextCart[key];
  return nextCart;
}

/**
 * Return a fresh empty cart object.
 *
 * @returns {Record<string, number>} Empty cart map.
 */
export function clearCart() {
  return {};
}
