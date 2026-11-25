import { SHOP_CONFIG } from "./data.js";
import {
  addToCart,
  changeQuantity,
  removeItem,
  clearCart,
  getProductById,
} from "./cart.js";
import { totals } from "./totals.js";
import {
  CART_STORAGE_KEY,
  PREFS_STORAGE_KEY,
  loadCart,
  saveCart,
  loadPrefs,
  savePrefs,
  loadReviews,
  saveReviews,
} from "./storage.js";
import {
  renderCategoryChips,
  renderCatalogue,
  renderCart,
  renderProductDialog,
  renderCheckoutDialog,
  showToast,
} from "./render.js";

/**
 * Generate a realistic-looking demo order reference number.
 *
 * @returns {string} Demo order identifier.
 */
function createDemoOrderNumber() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `KC-${new Date().getFullYear()}-${randomDigits}`;
}

/**
 * Debounce a function call by a fixed delay in milliseconds.
 *
 * @param {Function} fn - Callback to debounce.
 * @param {number} delayMs - Delay in milliseconds.
 * @returns {Function} Debounced wrapper.
 */
function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Collect focusable elements inside a container for keyboard focus trapping.
 *
 * @param {HTMLElement} container - Container element.
 * @returns {HTMLElement[]} Focusable descendants.
 */
function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

/**
 * Initialize the Kiosk Co. storefront application.
 */
function init() {
  const elements = {
    searchInput: document.getElementById("search-input"),
    themeToggle: document.getElementById("theme-toggle"),
    themeIcon: document.getElementById("theme-icon"),
    themeLabel: document.getElementById("theme-label"),
    cartToggle: document.getElementById("cart-toggle"),
    cartBadge: document.getElementById("cart-badge"),
    categoryFilters: document.getElementById("category-filters"),
    sortSelect: document.getElementById("sort-select"),
    resultsCount: document.getElementById("results-count"),
    productGrid: document.getElementById("product-grid"),
    catalogueEmpty: document.getElementById("catalogue-empty"),
    cartBackdrop: document.getElementById("cart-backdrop"),
    cartDrawer: document.getElementById("cart-drawer"),
    cartClose: document.getElementById("cart-close"),
    deliveryHint: document.getElementById("delivery-hint"),
    cartContent: document.getElementById("cart-content"),
    cartFooter: document.getElementById("cart-footer"),
    productDialog: document.getElementById("product-dialog"),
    productDialogClose: document.getElementById("product-dialog-close"),
    productDialogCrumb: document.getElementById("product-dialog-crumb"),
    productDialogBody: document.getElementById("product-dialog-body"),
    checkoutDialog: document.getElementById("checkout-dialog"),
    checkoutCloseTop: document.getElementById("checkout-close-top"),
    checkoutBody: document.getElementById("checkout-body"),
    toastRegion: document.getElementById("toast-region"),
  };

  const prefs = loadPrefs();
  const state = {
    cart: loadCart(),
    reviews: loadReviews(),
    coupon: prefs.coupon,
    theme: prefs.theme,
    sort: prefs.sort,
    category: prefs.category,
    search: "",
    isCartOpen: false,
    activeProductId: null,
    detailQty: 1,
    pendingOrderNumber: createDemoOrderNumber(),
    orderConfirmed: null,
  };

  let lastTrigger = null;

  /**
   * Apply the current theme preference to the root element and toggle button.
   */
  function applyTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveDark =
      state.theme === "dark" || (state.theme === "auto" && prefersDark);

    if (state.theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", state.theme);
    }

    elements.themeToggle.setAttribute("aria-pressed", String(effectiveDark));
    elements.themeToggle.setAttribute(
      "aria-label",
      effectiveDark ? "Switch to light theme" : "Switch to dark theme"
    );
    elements.themeIcon.textContent = effectiveDark ? "☀" : "☾";
    elements.themeLabel.textContent = effectiveDark ? "Light" : "Dark";
  }

  /**
   * Persist cart and preferences to localStorage.
   */
  function save() {
    saveCart(state.cart);
    savePrefs({
      coupon: state.coupon,
      theme: state.theme,
      sort: state.sort,
      category: state.category,
    });
  }

  /**
   * Single render pipeline driven by the single state object.
   */
  function render() {
    const orderTotals = totals(state.cart, state.coupon);
    renderCategoryChips(elements.categoryFilters, state.category);
    renderCatalogue(elements, state);
    renderCart(elements, state, orderTotals);
    elements.sortSelect.value = state.sort;
    applyTheme();
  }

  /**
   * Trigger a brief bump animation on the header cart badge.
   */
  function bumpCartBadge() {
    elements.cartBadge.classList.remove("is-bumped");
    void elements.cartBadge.offsetWidth;
    elements.cartBadge.classList.add("is-bumped");
  }

  /**
   * Open the cart drawer and move keyboard focus inside.
   */
  function openCart() {
    if (state.isCartOpen) {
      return;
    }
    lastTrigger = document.activeElement;
    state.isCartOpen = true;
    elements.cartBackdrop.hidden = false;
    elements.cartDrawer.hidden = false;
    elements.cartToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
    elements.cartClose.focus();
  }

  /**
   * Close the cart drawer and restore focus to the trigger element.
   */
  function closeCart() {
    if (!state.isCartOpen) {
      return;
    }
    state.isCartOpen = false;
    elements.cartBackdrop.hidden = true;
    elements.cartDrawer.hidden = true;
    elements.cartToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
    if (lastTrigger instanceof HTMLElement) {
      lastTrigger.focus();
    } else {
      elements.cartToggle.focus();
    }
  }

  /**
   * Open the Product Detail View dialog for a given product id.
   *
   * @param {number|string} id - Product identifier.
   */
  function openProduct(id) {
    const product = getProductById(id);
    if (!product) {
      return;
    }
    if (!elements.productDialog.open) {
      lastTrigger = document.activeElement;
    }
    state.activeProductId = product.id;
    state.detailQty = 1;
    renderProductDialog(elements, state, product);
    elements.productDialogBody.scrollTop = 0;
    document.body.classList.add("is-locked");

    if (typeof elements.productDialog.showModal === "function") {
      if (!elements.productDialog.open) {
        elements.productDialog.showModal();
      }
    } else {
      elements.productDialog.setAttribute("open", "");
    }
  }

  /**
   * Close the Product Detail View dialog and restore scroll and focus.
   */
  function closeProduct() {
    state.activeProductId = null;
    if (typeof elements.productDialog.close === "function" && elements.productDialog.open) {
      elements.productDialog.close();
    } else {
      elements.productDialog.removeAttribute("open");
    }
    if (!state.isCartOpen && !elements.checkoutDialog.open) {
      document.body.classList.remove("is-locked");
    }
    if (lastTrigger instanceof HTMLElement && lastTrigger.isConnected) {
      lastTrigger.focus();
    }
  }

  /**
   * Open the native checkout <dialog> with a graceful fallback if showModal is unavailable.
   */
  function openCheckout() {
    const orderTotals = totals(state.cart, state.coupon);
    if (orderTotals.itemCount === 0) {
      return;
    }
    lastTrigger = document.activeElement;
    state.orderConfirmed = null;
    state.pendingOrderNumber = createDemoOrderNumber();
    renderCheckoutDialog(elements, state, orderTotals);
    document.body.classList.add("is-locked");

    if (typeof elements.checkoutDialog.showModal === "function") {
      elements.checkoutDialog.showModal();
    } else {
      elements.checkoutDialog.setAttribute("open", "");
    }
  }

  /**
   * Close the checkout <dialog> and restore scroll and focus.
   */
  function closeCheckout() {
    if (typeof elements.checkoutDialog.close === "function" && elements.checkoutDialog.open) {
      elements.checkoutDialog.close();
    } else {
      elements.checkoutDialog.removeAttribute("open");
    }
    if (!state.isCartOpen) {
      document.body.classList.remove("is-locked");
    }
    if (lastTrigger instanceof HTMLElement && lastTrigger.isConnected) {
      lastTrigger.focus();
    } else {
      elements.cartToggle.focus();
    }
  }

  // Event: delegated add-to-cart and open-product on product grid
  elements.productGrid.addEventListener("click", (event) => {
    const openTrigger = event.target.closest('[data-action="open-product"]');
    if (openTrigger) {
      openProduct(openTrigger.dataset.id);
      return;
    }
    const button = event.target.closest("button[data-id]");
    if (!button) {
      return;
    }
    const product = getProductById(button.dataset.id);
    if (!product) {
      return;
    }
    state.cart = addToCart(state.cart, product.id);
    save();
    render();
    bumpCartBadge();
    showToast(elements.toastRegion, `${product.name} added to cart`);
  });

  // Event: product detail dialog interactions
  elements.productDialogClose.addEventListener("click", closeProduct);
  elements.productDialog.addEventListener("click", (event) => {
    if (event.target === elements.productDialog) {
      closeProduct();
      return;
    }
    const btn = event.target.closest("button[data-action]");
    if (!btn) {
      return;
    }
    const action = btn.dataset.action;
    const product = getProductById(state.activeProductId);
    if (!product) {
      return;
    }

    if (action === "open-related") {
      openProduct(btn.dataset.id);
      return;
    }
    if (action === "pdp-inc") {
      const inCart = state.cart[String(product.id)] ?? 0;
      const maxAllowed = Math.max(1, SHOP_CONFIG.maxQtyPerItem - inCart);
      state.detailQty = Math.min(maxAllowed, state.detailQty + 1);
      renderProductDialog(elements, state, product);
      return;
    }
    if (action === "pdp-dec") {
      state.detailQty = Math.max(1, state.detailQty - 1);
      renderProductDialog(elements, state, product);
      return;
    }
    if (action === "pdp-add") {
      state.cart = changeQuantity(state.cart, product.id, state.detailQty);
      state.detailQty = 1;
      save();
      render();
      renderProductDialog(elements, state, product);
      bumpCartBadge();
      showToast(elements.toastRegion, `${product.name} added to cart`);
      return;
    }
    if (action === "pdp-buy-now") {
      const inCart = state.cart[String(product.id)] ?? 0;
      if (inCart < SHOP_CONFIG.maxQtyPerItem) {
        state.cart = changeQuantity(state.cart, product.id, state.detailQty);
        save();
        render();
        bumpCartBadge();
      }
      closeProduct();
      openCheckout();
    }
  });

  elements.productDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeProduct();
  });

  // Event: submit a review/comment inside the product detail dialog
  elements.productDialog.addEventListener("submit", (event) => {
    const form = event.target.closest('form[data-action="review-form"]');
    if (!form) {
      return;
    }
    event.preventDefault();
    const product = getProductById(state.activeProductId);
    if (!product) {
      return;
    }
    const formData = new FormData(form);
    const author = String(formData.get("author") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();
    const rating = Number(formData.get("rating") ?? 5);
    if (!author || !comment) {
      return;
    }
    const key = String(product.id);
    const existing = state.reviews[key] ?? [];
    const newReview = {
      author,
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 5,
      comment,
      date: new Date().toLocaleDateString(SHOP_CONFIG.locale, { dateStyle: "medium" }),
    };
    state.reviews = {
      ...state.reviews,
      [key]: [newReview, ...existing],
    };
    saveReviews(state.reviews);
    renderProductDialog(elements, state, product);
    showToast(elements.toastRegion, "Comment posted — thank you!");
  });

  // Event: clear filters from empty catalogue state
  elements.catalogueEmpty.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="clear-filters"]');
    if (!button) {
      return;
    }
    state.search = "";
    state.category = "All";
    state.sort = "featured";
    elements.searchInput.value = "";
    save();
    render();
  });

  // Event: debounced search (250ms)
  elements.searchInput.addEventListener(
    "input",
    debounce((event) => {
      state.search = event.target.value;
      render();
    }, 250)
  );

  // Event: category chip delegation
  elements.categoryFilters.addEventListener("click", (event) => {
    const chip = event.target.closest("button[data-category]");
    if (!chip) {
      return;
    }
    state.category = chip.dataset.category;
    save();
    render();
  });

  // Event: sort select
  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    save();
    render();
  });

  // Event: theme toggle
  elements.themeToggle.addEventListener("click", () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isCurrentlyDark =
      state.theme === "dark" || (state.theme === "auto" && prefersDark);
    state.theme = isCurrentlyDark ? "light" : "dark";
    save();
    applyTheme();
  });

  // Event: cart drawer open/close
  elements.cartToggle.addEventListener("click", openCart);
  elements.cartClose.addEventListener("click", closeCart);
  elements.cartBackdrop.addEventListener("click", closeCart);

  // Event: cart content delegation (qty -, +, remove, continue shopping)
  elements.cartContent.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) {
      return;
    }
    const { action, id } = btn.dataset;
    if (action === "continue-shopping") {
      closeCart();
      return;
    }
    if (action === "inc") {
      state.cart = changeQuantity(state.cart, id, 1);
      save();
      render();
      return;
    }
    if (action === "dec") {
      state.cart = changeQuantity(state.cart, id, -1);
      save();
      render();
      return;
    }
    if (action === "remove") {
      const key = String(id);
      const previousQty = state.cart[key] ?? 0;
      const product = getProductById(id);
      state.cart = removeItem(state.cart, id);
      save();
      render();

      if (product && previousQty > 0) {
        showToast(elements.toastRegion, `${product.name} removed`, "Undo", () => {
          state.cart = changeQuantity(state.cart, product.id, previousQty);
          save();
          render();
        });
      }
    }
  });

  // Event: cart footer delegation (clear cart, checkout, remove coupon)
  elements.cartFooter.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) {
      return;
    }
    const { action } = btn.dataset;
    if (action === "clear-cart") {
      state.cart = clearCart();
      state.coupon = "";
      save();
      render();
      return;
    }
    if (action === "remove-coupon") {
      state.coupon = "";
      save();
      render();
      return;
    }
    if (action === "quick-coupon") {
      state.coupon = btn.dataset.code ?? "";
      save();
      render();
      return;
    }
    if (action === "open-checkout") {
      openCheckout();
    }
  });

  // Event: coupon form submit
  elements.cartFooter.addEventListener("submit", (event) => {
    const form = event.target.closest('form[data-action="coupon-form"]');
    if (!form) {
      return;
    }
    event.preventDefault();
    const input = form.querySelector("#coupon-input");
    state.coupon = input ? input.value.trim() : "";
    save();
    render();
  });

  // Event: checkout dialog actions
  elements.checkoutCloseTop.addEventListener("click", closeCheckout);
  elements.checkoutDialog.addEventListener("click", (event) => {
    if (event.target === elements.checkoutDialog) {
      closeCheckout();
      return;
    }
    const btn = event.target.closest("button[data-action]");
    if (!btn) {
      return;
    }
    if (btn.dataset.action === "close-checkout") {
      closeCheckout();
      return;
    }
    if (btn.dataset.action === "place-demo-order") {
      state.orderConfirmed = {
        orderNumber: state.pendingOrderNumber,
        timestamp: new Date().toLocaleString(SHOP_CONFIG.locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      };
      state.cart = clearCart();
      state.coupon = "";
      save();
      render();
      renderCheckoutDialog(elements, state, totals(state.cart, state.coupon));
    }
  });

  elements.checkoutDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCheckout();
  });

  // Event: Escape key and focus trap inside cart drawer
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.isCartOpen && !elements.checkoutDialog.open) {
      closeCart();
      return;
    }
    if (event.key === "Tab" && state.isCartOpen && !elements.checkoutDialog.open) {
      const focusables = getFocusableElements(elements.cartDrawer);
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Event: cross-tab localStorage synchronization
  window.addEventListener("storage", (event) => {
    if (event.key === CART_STORAGE_KEY) {
      state.cart = loadCart();
      render();
    } else if (event.key === PREFS_STORAGE_KEY) {
      const updated = loadPrefs();
      state.coupon = updated.coupon;
      state.theme = updated.theme;
      state.sort = updated.sort;
      state.category = updated.category;
      render();
    }
  });

  render();
}

init();
