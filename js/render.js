import { products, SHOP_CONFIG } from "./data.js";
import { getProductById } from "./cart.js";
import { formatMoney } from "./totals.js";

/**
 * Create a DOM element with optional class name and text content.
 * Never uses innerHTML.
 *
 * @param {string} tag - HTML tag name.
 * @param {string} [className=""] - CSS class string.
 * @param {string} [text=""] - Text content.
 * @returns {HTMLElement} Created element.
 */
function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== "") {
    node.textContent = text;
  }
  return node;
}

/**
 * Compute the visible, filtered, and sorted product list without mutating source data.
 *
 * @param {{ category: string, search: string, sort: string }} state - Current filter/sort state.
 * @returns {object[]} New array of matching products.
 */
export function getVisibleProducts(state) {
  const query = state.search.trim().toLowerCase();

  const filtered = products.filter((product) => {
    const matchesCategory =
      state.category === "All" || product.category === state.category;
    if (!matchesCategory) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  });

  if (state.sort === "price-asc") {
    return [...filtered].sort((a, b) => a.price - b.price || a.id - b.id);
  }
  if (state.sort === "price-desc") {
    return [...filtered].sort((a, b) => b.price - a.price || a.id - b.id);
  }
  if (state.sort === "name-asc") {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }
  return filtered;
}

/**
 * Render category filter chip buttons with item counts and aria-pressed state.
 *
 * @param {HTMLElement} container - Filter chips container.
 * @param {string} activeCategory - Currently selected category.
 */
export function renderCategoryChips(container, activeCategory) {
  const counts = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] ?? 0) + 1;
    return acc;
  }, {});
  const categories = ["All", ...Object.keys(counts)];
  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const count = category === "All" ? products.length : counts[category];
    const btn = el("button", "filter-chip", `${category} (${count})`);
    btn.type = "button";
    btn.dataset.category = category;
    btn.setAttribute("aria-pressed", String(category === activeCategory));
    fragment.appendChild(btn);
  });

  container.replaceChildren(fragment);
}

/**
 * Render the product catalogue grid, live result count, and empty state.
 *
 * @param {object} elements - Cached DOM references.
 * @param {object} state - Application state.
 */
export function renderCatalogue(elements, state) {
  const visible = getVisibleProducts(state);
  const totalCount = products.length;

  elements.resultsCount.textContent =
    visible.length === totalCount
      ? `Showing all ${totalCount} products`
      : `Showing ${visible.length} of ${totalCount} products`;

  if (visible.length === 0) {
    elements.productGrid.replaceChildren();
    elements.productGrid.hidden = true;

    const title = el("h3", "empty-state__title", "No products match your search");
    const desc = el(
      "p",
      "empty-state__text",
      "Try a different keyword or reset your category filter."
    );
    const clearBtn = el("button", "btn btn--secondary", "Clear filters");
    clearBtn.type = "button";
    clearBtn.dataset.action = "clear-filters";

    elements.catalogueEmpty.replaceChildren(title, desc, clearBtn);
    elements.catalogueEmpty.hidden = false;
    return;
  }

  elements.catalogueEmpty.hidden = true;
  elements.catalogueEmpty.replaceChildren();
  elements.productGrid.hidden = false;

  const fragment = document.createDocumentFragment();

  visible.forEach((product) => {
    const card = el("article", "product-card");
    const media = el("div", "product-card__media");
    media.dataset.action = "open-product";
    media.dataset.id = String(product.id);

    const img = document.createElement("img");
    img.className = "product-card__img";
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";

    const categoryBadge = el("span", "product-card__badge-cat", product.category);
    const ratingBadge = el(
      "span",
      "product-card__rating",
      `★ ${product.rating.toFixed(1)}`
    );
    media.append(img, categoryBadge, ratingBadge);

    const body = el("div", "product-card__body");
    const metaRow = el("div", "product-card__meta-row");
    const stockBadge = el("span", "product-card__stock", `In stock (${product.stock})`);
    const skuCode = el("span", "product-card__code", product.imageText);
    metaRow.append(stockBadge, skuCode);

    const title = el("h3", "product-card__title");
    const titleBtn = el("button", "product-card__title-btn", product.name);
    titleBtn.type = "button";
    titleBtn.dataset.action = "open-product";
    titleBtn.dataset.id = String(product.id);
    title.appendChild(titleBtn);

    const description = el("p", "product-card__description", product.description);

    const footer = el("div", "product-card__footer");
    const price = el("span", "product-card__price", formatMoney(product.price));

    const qtyInCart = state.cart[String(product.id)] ?? 0;
    const isMaxed = qtyInCart >= SHOP_CONFIG.maxQtyPerItem;

    const addBtn = el("button", "btn btn--primary product-card__btn");
    addBtn.type = "button";
    addBtn.dataset.id = String(product.id);

    if (isMaxed) {
      addBtn.textContent = "Max reached";
      addBtn.disabled = true;
      addBtn.setAttribute(
        "aria-label",
        `${product.name} — maximum quantity reached in cart`
      );
    } else if (qtyInCart > 0) {
      addBtn.textContent = `In cart (${qtyInCart})`;
      addBtn.setAttribute(
        "aria-label",
        `Add another ${product.name} to cart (${qtyInCart} currently in cart)`
      );
    } else {
      addBtn.textContent = "Add to cart";
      addBtn.setAttribute("aria-label", `Add ${product.name} to cart`);
    }

    footer.append(price, addBtn);
    body.append(metaRow, title, description, footer);
    card.append(media, body);
    fragment.appendChild(card);
  });

  elements.productGrid.replaceChildren(fragment);
}

/**
 * Create a summary row element for cart or checkout totals.
 *
 * @param {string} label - Row label.
 * @param {string} value - Formatted value.
 * @param {string} [extraClass=""] - Optional modifier class.
 * @returns {HTMLDivElement} Summary row element.
 */
function createSummaryRow(label, value, extraClass = "") {
  const row = el("div", `summary-list__row ${extraClass}`.trim());
  const labelSpan = el("span", "", label);
  const valueSpan = el("span", "", value);
  row.append(labelSpan, valueSpan);
  return row;
}

/**
 * Render the header cart badge, delivery progress hint, cart table, coupon box, and summary.
 *
 * @param {object} elements - Cached DOM references.
 * @param {object} state - Application state.
 * @param {object} orderTotals - Result from totals().
 */
export function renderCart(elements, state, orderTotals) {
  const { itemCount, subtotal, discount, delivery, total, couponResult } = orderTotals;

  elements.cartBadge.textContent = String(itemCount);
  const itemWord = itemCount === 1 ? "item" : "items";
  elements.cartToggle.setAttribute("aria-label", `Cart, ${itemCount} ${itemWord}`);

  // Delivery progress hint
  if (itemCount === 0) {
    elements.deliveryHint.hidden = true;
    elements.deliveryHint.replaceChildren();
  } else {
    elements.deliveryHint.hidden = false;
    const threshold = SHOP_CONFIG.freeDeliveryThreshold;
    const remaining = Math.max(0, threshold - subtotal);
    const hintText =
      remaining > 0
        ? `Add ${formatMoney(remaining)} more for free delivery`
        : "You unlocked free delivery!";

    const textNode = el("p", "delivery-hint__text", hintText);
    const progress = document.createElement("progress");
    progress.className = "delivery-hint__progress";
    progress.max = threshold;
    progress.value = Math.min(threshold, subtotal);
    progress.setAttribute("aria-label", "Free delivery progress");

    elements.deliveryHint.replaceChildren(textNode, progress);
  }

  // Empty cart state
  if (itemCount === 0) {
    const emptyBox = el("div", "empty-state");
    const title = el("h3", "empty-state__title", "Your cart is empty");
    const text = el(
      "p",
      "empty-state__text",
      "Explore our stationery and desk essentials to add items."
    );
    const continueBtn = el("button", "btn btn--primary", "Continue shopping");
    continueBtn.type = "button";
    continueBtn.dataset.action = "continue-shopping";

    emptyBox.append(title, text, continueBtn);
    elements.cartContent.replaceChildren(emptyBox);

    const checkoutBtn = el("button", "btn btn--primary btn--full", "Checkout");
    checkoutBtn.type = "button";
    checkoutBtn.disabled = true;
    elements.cartFooter.replaceChildren(checkoutBtn);
    return;
  }

  // Semantic cart table
  const table = el("table", "cart-table");
  const caption = el("caption", "", `Shopping cart with ${itemCount} ${itemWord}`);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Product", "Price", "Quantity", "Line total", "Remove"].forEach((heading) => {
    const th = el("th", "", heading);
    th.scope = "col";
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  Object.entries(state.cart).forEach(([id, qty]) => {
    const product = getProductById(id);
    if (!product) {
      return;
    }

    const row = document.createElement("tr");

    const nameCell = document.createElement("th");
    nameCell.scope = "row";
    const nameWrap = el("div", "cart-table__product-wrap");
    const thumb = document.createElement("img");
    thumb.className = "cart-table__thumb";
    thumb.src = product.image;
    thumb.alt = "";
    const nameLabel = el("span", "cart-table__product", product.name);
    nameWrap.append(thumb, nameLabel);
    nameCell.appendChild(nameWrap);

    const priceCell = el("td", "cart-table__money", formatMoney(product.price));
    priceCell.dataset.label = "Price";

    const qtyCell = document.createElement("td");
    qtyCell.dataset.label = "Quantity";
    const qtyControl = el("div", "qty-control");

    const decBtn = el("button", "qty-control__btn", "−");
    decBtn.type = "button";
    decBtn.dataset.action = "dec";
    decBtn.dataset.id = String(product.id);
    decBtn.setAttribute("aria-label", `Decrease quantity of ${product.name}`);

    const qtyVal = el("span", "qty-control__value", String(qty));
    qtyVal.setAttribute("aria-label", `Quantity of ${product.name}`);

    const incBtn = el("button", "qty-control__btn", "+");
    incBtn.type = "button";
    incBtn.dataset.action = "inc";
    incBtn.dataset.id = String(product.id);
    incBtn.disabled = qty >= SHOP_CONFIG.maxQtyPerItem;
    incBtn.setAttribute("aria-label", `Increase quantity of ${product.name}`);

    qtyControl.append(decBtn, qtyVal, incBtn);
    qtyCell.appendChild(qtyControl);

    const lineTotalCell = el(
      "td",
      "cart-table__money",
      formatMoney(product.price * qty)
    );
    lineTotalCell.dataset.label = "Line total";

    const removeCell = document.createElement("td");
    removeCell.dataset.label = "Remove";
    const removeBtn = el("button", "btn btn--danger", "Remove");
    removeBtn.type = "button";
    removeBtn.dataset.action = "remove";
    removeBtn.dataset.id = String(product.id);
    removeBtn.setAttribute("aria-label", `Remove ${product.name} from cart`);
    removeCell.appendChild(removeBtn);

    row.append(nameCell, priceCell, qtyCell, lineTotalCell, removeCell);
    tbody.appendChild(row);
  });

  table.append(caption, thead, tbody);
  elements.cartContent.replaceChildren(table);

  // Cart footer: coupon + totals + actions
  const footerFrag = document.createDocumentFragment();

  const couponForm = el("form", "coupon-box");
  couponForm.dataset.action = "coupon-form";
  const couponLabel = el(
    "label",
    "sort-control__label",
    "Coupon code (try SAVE10 or FLAT50)"
  );
  couponLabel.htmlFor = "coupon-input";

  const couponRow = el("div", "coupon-box__row");
  const couponInput = el("input", "coupon-box__input");
  couponInput.id = "coupon-input";
  couponInput.type = "text";
  couponInput.placeholder = "Enter code";
  couponInput.value = state.coupon;
  couponInput.setAttribute("autocomplete", "off");

  const applyBtn = el("button", "btn btn--secondary", "Apply");
  applyBtn.type = "submit";
  couponRow.append(couponInput, applyBtn);

  if (state.coupon.trim() !== "") {
    const removeCouponBtn = el("button", "btn btn--ghost", "Remove");
    removeCouponBtn.type = "button";
    removeCouponBtn.dataset.action = "remove-coupon";
    removeCouponBtn.setAttribute("aria-label", "Remove coupon");
    couponRow.appendChild(removeCouponBtn);
  }

  couponForm.append(couponLabel, couponRow);

  const quickRow = el("div", "coupon-quick");
  const quickLabel = el("span", "", "Quick apply:");
  quickRow.appendChild(quickLabel);
  Object.keys(SHOP_CONFIG.coupons).forEach((code) => {
    const chip = el("button", "coupon-quick__chip", code);
    chip.type = "button";
    chip.dataset.action = "quick-coupon";
    chip.dataset.code = code;
    quickRow.appendChild(chip);
  });
  couponForm.appendChild(quickRow);

  if (couponResult.message) {
    const feedbackClass = couponResult.valid
      ? "coupon-box__feedback coupon-box__feedback--success"
      : "coupon-box__feedback coupon-box__feedback--error";
    const feedback = el("p", feedbackClass, couponResult.message);
    feedback.setAttribute("role", "status");
    couponForm.appendChild(feedback);
  }

  const summaryList = el("div", "summary-list");
  summaryList.appendChild(createSummaryRow("Subtotal", formatMoney(subtotal)));
  if (discount > 0) {
    summaryList.appendChild(
      createSummaryRow(
        `Discount (${couponResult.code})`,
        `−${formatMoney(discount)}`,
        "summary-list__discount"
      )
    );
  }
  summaryList.appendChild(
    createSummaryRow("Delivery", delivery === 0 ? "Free" : formatMoney(delivery))
  );
  summaryList.appendChild(
    createSummaryRow("Grand total", formatMoney(total), "summary-list__row--total")
  );

  const actions = el("div", "cart-actions");
  const clearCartBtn = el("button", "btn btn--ghost", "Clear cart");
  clearCartBtn.type = "button";
  clearCartBtn.dataset.action = "clear-cart";

  const checkoutBtn = el("button", "btn btn--primary btn--full", "Checkout");
  checkoutBtn.type = "button";
  checkoutBtn.dataset.action = "open-checkout";

  actions.append(clearCartBtn, checkoutBtn);
  footerFrag.append(couponForm, summaryList, actions);
  elements.cartFooter.replaceChildren(footerFrag);
}

/**
 * Select related products prioritizing the same category, excluding the active product.
 *
 * @param {object} product - Active product object.
 * @param {number} [limit=3] - Maximum number of recommendations.
 * @returns {object[]} Array of related product objects.
 */
export function getRelatedProducts(product, limit = 3) {
  const sameCategory = products.filter(
    (item) => item.category === product.category && item.id !== product.id
  );
  const others = products.filter(
    (item) => item.category !== product.category && item.id !== product.id
  );
  return [...sameCategory, ...others].slice(0, limit);
}

/**
 * Render the Amazon/Flipkart-style Product Detail View and related recommendations.
 *
 * @param {object} elements - Cached DOM references.
 * @param {object} state - Application state.
 * @param {object} product - Product object to display.
 */
export function renderProductDialog(elements, state, product) {
  elements.productDialogCrumb.textContent = `Shop / ${product.category} / ${product.imageText}`;

  const frag = document.createDocumentFragment();
  const grid = el("div", "pdp-grid");

  // Left: large gallery frame
  const gallery = el("div", "pdp-gallery");
  const img = document.createElement("img");
  img.className = "pdp-gallery__img";
  img.src = product.image;
  img.alt = product.name;
  gallery.appendChild(img);

  // Right: full details, highlights, specs, quantity & actions
  const info = el("div", "pdp-info");
  const title = el("h2", "pdp-info__title", product.name);
  title.id = "product-dialog-title";

  const userReviews = state.reviews[String(product.id)] ?? [];
  const totalReviews = product.reviewCount + userReviews.length;

  const ratingRow = el("div", "pdp-info__rating-row");
  const stars = el("span", "pdp-info__stars", `★ ${product.rating.toFixed(1)}`);
  const reviews = el(
    "span",
    "pdp-info__reviews",
    `${totalReviews} studio reviews · ${product.stock} in stock`
  );
  ratingRow.append(stars, reviews);

  const priceBox = el("div", "pdp-info__price-box");
  const price = el("span", "pdp-info__price", formatMoney(product.price));
  const deliveryMsg =
    product.price >= SHOP_CONFIG.freeDeliveryThreshold
      ? "Free delivery on this item"
      : `₹${SHOP_CONFIG.deliveryFee} delivery · Free on orders ₹${SHOP_CONFIG.freeDeliveryThreshold}+`;
  const delivery = el("span", "pdp-info__delivery", deliveryMsg);
  priceBox.append(price, delivery);

  const desc = el("p", "pdp-info__desc", product.description);

  const highlights = el("ul", "pdp-highlights");
  product.highlights.forEach((bullet) => {
    highlights.appendChild(el("li", "", bullet));
  });

  const specsGrid = el("dl", "pdp-specs");
  Object.entries(product.specs).forEach(([term, val]) => {
    const item = el("div", "pdp-specs__item");
    item.append(el("dt", "pdp-specs__term", term), el("dd", "pdp-specs__val", val));
    specsGrid.appendChild(item);
  });

  const inCartQty = state.cart[String(product.id)] ?? 0;
  const remainingAllowance = Math.max(0, SHOP_CONFIG.maxQtyPerItem - inCartQty);
  const effectiveQty = Math.min(state.detailQty, Math.max(1, remainingAllowance));

  const actions = el("div", "pdp-actions");
  const qtyControl = el("div", "qty-control");

  const decBtn = el("button", "qty-control__btn", "−");
  decBtn.type = "button";
  decBtn.dataset.action = "pdp-dec";
  decBtn.disabled = effectiveQty <= 1 || remainingAllowance === 0;
  decBtn.setAttribute("aria-label", "Decrease quantity");

  const qtyVal = el(
    "span",
    "qty-control__value",
    remainingAllowance === 0 ? "0" : String(effectiveQty)
  );

  const incBtn = el("button", "qty-control__btn", "+");
  incBtn.type = "button";
  incBtn.dataset.action = "pdp-inc";
  incBtn.disabled = effectiveQty >= remainingAllowance;
  incBtn.setAttribute("aria-label", "Increase quantity");

  qtyControl.append(decBtn, qtyVal, incBtn);

  const btnGroup = el("div", "pdp-actions__btns");
  const addBtn = el(
    "button",
    "btn btn--primary",
    remainingAllowance === 0
      ? `Max in cart (${inCartQty})`
      : inCartQty > 0
        ? `Add to cart (${inCartQty} in cart)`
        : "Add to cart"
  );
  addBtn.type = "button";
  addBtn.dataset.action = "pdp-add";
  addBtn.dataset.id = String(product.id);
  addBtn.disabled = remainingAllowance === 0;

  const buyBtn = el("button", "btn btn--secondary", "Buy now (Demo)");
  buyBtn.type = "button";
  buyBtn.dataset.action = "pdp-buy-now";
  buyBtn.dataset.id = String(product.id);

  btnGroup.append(addBtn, buyBtn);
  actions.append(qtyControl, btnGroup);

  info.append(title, ratingRow, priceBox, desc, highlights, specsGrid, actions);
  grid.append(gallery, info);

  // Bottom: Related Products section
  const relatedSection = el("section", "pdp-related");
  relatedSection.setAttribute("aria-label", "Recommended products");
  const relatedHeading = el(
    "h3",
    "pdp-related__title",
    `Related in ${product.category} & Studio Picks`
  );
  const relatedGrid = el("div", "pdp-related__grid");

  getRelatedProducts(product, 3).forEach((rel) => {
    const relBtn = el("button", "related-card");
    relBtn.type = "button";
    relBtn.dataset.action = "open-related";
    relBtn.dataset.id = String(rel.id);

    const relImg = document.createElement("img");
    relImg.className = "related-card__img";
    relImg.src = rel.image;
    relImg.alt = rel.name;
    relImg.loading = "lazy";

    const relBody = el("div", "related-card__body");
    const relName = el("span", "related-card__name", rel.name);
    const relMeta = el("div", "related-card__meta");
    relMeta.append(
      el("span", "", formatMoney(rel.price)),
      el("span", "", `★ ${rel.rating.toFixed(1)}`)
    );
    relBody.append(relName, relMeta);
    relBtn.append(relImg, relBody);
    relatedGrid.appendChild(relBtn);
  });

  relatedSection.append(relatedHeading, relatedGrid);

  // Customer Reviews & Comments section
  const reviewsSection = el("section", "pdp-reviews");
  reviewsSection.setAttribute("aria-label", "Customer reviews and comments");
  const reviewsHeading = el(
    "h3",
    "pdp-reviews__title",
    `Customer Reviews & Comments (${userReviews.length} new)`
  );

  const reviewForm = el("form", "review-form");
  reviewForm.dataset.action = "review-form";

  const authorInput = el("input", "review-form__input");
  authorInput.type = "text";
  authorInput.name = "author";
  authorInput.placeholder = "Your name (e.g., Aarav M.)";
  authorInput.required = true;
  authorInput.maxLength = 40;
  authorInput.setAttribute("aria-label", "Your name");

  const ratingSelect = el("select", "review-form__select");
  ratingSelect.name = "rating";
  ratingSelect.setAttribute("aria-label", "Rating");
  [5, 4, 3, 2, 1].forEach((val) => {
    const opt = el("option", "", `${val} ★`);
    opt.value = String(val);
    ratingSelect.appendChild(opt);
  });

  const commentInput = el("textarea", "review-form__textarea");
  commentInput.name = "comment";
  commentInput.placeholder = "Share your thoughts on build quality, feel, or daily use...";
  commentInput.required = true;
  commentInput.maxLength = 280;
  commentInput.setAttribute("aria-label", "Review comment");

  const submitBtn = el("button", "btn btn--secondary review-form__submit", "Post comment");
  submitBtn.type = "submit";

  reviewForm.append(authorInput, ratingSelect, commentInput, submitBtn);

  const reviewList = el("ul", "review-list");
  if (userReviews.length === 0) {
    const emptyNote = el(
      "li",
      "review-card",
      "No new comments yet. Be the first to leave a note on this item."
    );
    reviewList.appendChild(emptyNote);
  } else {
    userReviews.forEach((rev) => {
      const li = el("li", "review-card");
      const head = el("div", "review-card__head");
      head.append(
        el("span", "review-card__author", `${rev.author} · ${"★".repeat(rev.rating)}`),
        el("span", "review-card__meta", rev.date)
      );
      const bodyText = el("p", "review-card__text", rev.comment);
      li.append(head, bodyText);
      reviewList.appendChild(li);
    });
  }

  reviewsSection.append(reviewsHeading, reviewForm, reviewList);
  frag.append(grid, relatedSection, reviewsSection);
  elements.productDialogBody.replaceChildren(frag);
}

/**
 * Render the checkout preview or thank-you confirmation inside the native dialog.
 *
 * @param {object} elements - Cached DOM references.
 * @param {object} state - Application state.
 * @param {object} orderTotals - Result from totals().
 */
export function renderCheckoutDialog(elements, state, orderTotals) {
  const frag = document.createDocumentFragment();

  if (state.orderConfirmed) {
    const box = el("div", "thank-you");
    const title = el("h3", "thank-you__title", "Thank you! Demo order placed.");
    const msg = el(
      "p",
      "thank-you__text",
      `Order ${state.orderConfirmed.orderNumber} recorded on ${state.orderConfirmed.timestamp}. No payment was taken and your cart has been cleared.`
    );
    box.append(title, msg);

    const actions = el("div", "checkout-dialog__actions");
    const closeBtn = el("button", "btn btn--primary", "Close");
    closeBtn.type = "button";
    closeBtn.dataset.action = "close-checkout";
    actions.appendChild(closeBtn);

    frag.append(box, actions);
    elements.checkoutBody.replaceChildren(frag);
    return;
  }

  const meta = el("div", "order-meta");
  const orderNum = el("span", "", `Order #${state.pendingOrderNumber}`);
  const dateText = el(
    "span",
    "",
    new Date().toLocaleString(SHOP_CONFIG.locale, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  );
  meta.append(orderNum, dateText);

  const list = el("ul", "order-items");
  Object.entries(state.cart).forEach(([id, qty]) => {
    const product = getProductById(id);
    if (!product) {
      return;
    }
    const li = el("li", "order-items__row");
    const label = el("span", "", `${product.name} × ${qty}`);
    const amount = el("span", "cart-table__money", formatMoney(product.price * qty));
    li.append(label, amount);
    list.appendChild(li);
  });

  const summary = el("div", "summary-list");
  summary.appendChild(createSummaryRow("Subtotal", formatMoney(orderTotals.subtotal)));
  if (orderTotals.discount > 0) {
    summary.appendChild(
      createSummaryRow(
        `Discount (${orderTotals.couponResult.code})`,
        `−${formatMoney(orderTotals.discount)}`,
        "summary-list__discount"
      )
    );
  }
  summary.appendChild(
    createSummaryRow(
      "Delivery",
      orderTotals.delivery === 0 ? "Free" : formatMoney(orderTotals.delivery)
    )
  );
  summary.appendChild(
    createSummaryRow(
      "Grand total",
      formatMoney(orderTotals.total),
      "summary-list__row--total"
    )
  );

  const actions = el("div", "checkout-dialog__actions");
  const closeBtn = el("button", "btn btn--secondary", "Close");
  closeBtn.type = "button";
  closeBtn.dataset.action = "close-checkout";

  const placeBtn = el("button", "btn btn--primary", "Place demo order");
  placeBtn.type = "button";
  placeBtn.dataset.action = "place-demo-order";

  actions.append(closeBtn, placeBtn);
  frag.append(meta, list, summary, actions);
  elements.checkoutBody.replaceChildren(frag);
}

/**
 * Display a brief accessible toast notification with an optional action button.
 *
 * @param {HTMLElement} container - Live toast region element.
 * @param {string} message - Notification text.
 * @param {string} [actionLabel=""] - Optional button label (e.g., "Undo").
 * @param {Function|null} [onAction=null] - Callback invoked when action button is clicked.
 */
export function showToast(container, message, actionLabel = "", onAction = null) {
  const toast = el("div", "toast");
  const text = el("span", "", message);
  toast.appendChild(text);

  let timerId = null;
  const dismiss = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
    toast.remove();
  };

  if (actionLabel && typeof onAction === "function") {
    const btn = el("button", "toast__action", actionLabel);
    btn.type = "button";
    btn.addEventListener("click", () => {
      onAction();
      dismiss();
    });
    toast.appendChild(btn);
  }

  container.replaceChildren(toast);
  timerId = window.setTimeout(dismiss, 4000);
}
