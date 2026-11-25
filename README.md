# Kiosk Co. Stationery & Desk

Option chosen: Shop

A vanilla HTML5, CSS3, and ES2020+ JavaScript mini e-commerce storefront with a working cart, live totals, coupon validation, `localStorage` persistence, light/dark themes, and an accessible demonstration checkout dialog. Built with zero frameworks, zero external libraries, and zero build tools.

## Live Demo

- Live URL: `https://<your-username>.github.io/<repo-name>/` (update after deploying to GitHub Pages)

## Features

- **12 Fictional Products** across 4 categories (`Stationery`, `Desk`, `Tech`, `Bags`) with generated typographic placeholder tiles.
- **Catalogue Controls**: 250ms debounced case-insensitive search, `aria-pressed` category filter chips, sorting (`Featured`, `Price: Low to High`, `Price: High to Low`, `Name: A to Z`), live result count (`aria-live="polite"`), and a "Clear filters" empty state.
- **Cart Drawer**: Slide-in panel on desktop, full-width on mobile, focus-trapped, Escape-to-close, semantic `<table>` with `<caption>` and `<th scope>`, `−`/`+` quantity buttons capped at 10, item removal with "Undo" toast, and friendly empty-cart state.
- **Totals & Coupons**: Live subtotal, free delivery threshold progress bar (free at ₹500+, otherwise ₹40), and case-insensitive coupon validation (`SAVE10` for 10% off; `FLAT50` for ₹50 off orders ≥ ₹300).
- **Demo Checkout (`<dialog>`)**: Native modal dialog with a clear `"DEMONSTRATION ONLY: no payment is taken"` banner, order summary, generated order number, and thank-you state that clears the cart and storage.
- **Persistence & Sync**: Safe `localStorage` read/write with JSON validation, private-mode in-memory fallback, and cross-tab sync via the `storage` event.
- **Theme Support**: Light and dark themes using CSS custom properties, defaulting to `prefers-color-scheme`.

## Tech Stack

- **HTML5**: Semantic landmarks (`header`, `main`, `nav`, `footer`), native `<dialog>`, `<progress>`, and `<table>`.
- **CSS3**: Custom properties, CSS Grid (`auto-fill`/`minmax`), BEM naming, fluid `clamp()` typography, `prefers-reduced-motion`, and `@media print`.
- **JavaScript (ES2020+ Modules)**: Pure cart and totals modules, `document.createElement` + `textContent` rendering (no `innerHTML`), and delegated event listeners.

## Folder Structure

```text
/mini-shop
  ├── index.html
  ├── tests.html
  ├── README.md
  ├── css/
  │    ├── base.css
  │    ├── components.css
  │    └── responsive.css
  └── js/
       ├── data.js
       ├── cart.js
       ├── totals.js
       ├── storage.js
       ├── render.js
       └── main.js
```

## Data Model & Cart State Shape

- **Product** (`js/data.js`, frozen with `Object.freeze`):
  ```js
  {
    id: 101,
    name: "Gridline A5 Notebook",
    price: 180, // Number in INR, never pre-formatted
    category: "Stationery",
    imageText: "A5 · GRID",
    description: "160-page 100gsm ivory paper notebook with lay-flat thread binding.",
    stock: 24
  }
  ```
- **Cart State** (`js/cart.js`):
  ```js
  { "101": 2, "202": 1 }
  ```

## How Totals Are Calculated

Order of calculation in `js/totals.js`:
`subtotal` → `discount` → `delivery` → `total`

1. **Subtotal**: `reduce` over cart entries summing `product.price * quantity`.
2. **Discount**:
   - `SAVE10`: `10%` of `subtotal`, rounded to 2 decimal places.
   - `FLAT50`: `₹50` off when `subtotal >= 300`.
3. **Delivery**: `₹40` when `0 < subtotal < 500`; `₹0` (Free) when `subtotal >= 500` or cart is empty.
4. **Grand Total**: `Math.max(0, subtotal - discount + delivery)`.
5. **Formatting**: Prices remain plain numbers throughout and are formatted only at display time via `toLocaleString("en-IN", { style: "currency", currency: "INR" })`.

### Worked Examples

- **Cart**: 1× Gridline A5 Notebook (`₹180`) + 1× Archival Sticky Tabs (`₹120`), no coupon
  - Subtotal = `₹300`
  - Discount = `₹0`
  - Delivery = `₹40` (subtotal `< 500`)
  - Grand Total = `₹340`
- **Cart**: 1× Walnut Pen Tray (`₹450`) + 1× Gridline A5 Notebook (`₹180`), coupon `SAVE10`
  - Subtotal = `₹630`
  - Discount = `₹63` (`10%` of `630`)
  - Delivery = `₹0` (subtotal `>= 500`)
  - Grand Total = `₹567`

## localStorage Strategy

- Keys: `"mini-shop:cart"` and `"mini-shop:prefs"`.
- On load (`js/storage.js`), JSON is parsed inside `try/catch`, unknown product IDs are dropped, quantities are coerced to positive integers and clamped to `maxQtyPerItem` (`10`), and corrupted JSON safely resets to an empty cart.
- If `localStorage` is unavailable (e.g., restricted private mode), an in-memory `Map` fallback prevents runtime errors.

## Accessibility Notes

- Semantic landmarks (`header`, `main`, `nav`, `footer`), single `<h1>`, and logical heading levels.
- `44px` minimum tap targets and visible `:focus-visible` outlines.
- `aria-live="polite"` regions for search result counts, delivery progress, and toast notifications.
- `aria-pressed` on category filter chips and theme toggle.
- Focus trapping in the cart drawer, `Escape` key closing, and focus restoration on close.
- Text contrast ≥ 4.5:1 across both light and dark themes.

## How to Run Locally

1. Open the `/mini-shop` folder in VS Code.
2. Right-click `index.html` and select **Open with Live Server** (or serve via `npx serve .` / `python -m http.server`).
3. Open `tests.html` in the browser to run and view the plain-JS unit test assertions.

## GitHub Pages Deployment

1. Push the `/mini-shop` contents to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and the folder containing `index.html`, and save.

## Screenshots

- `[Desktop Catalogue Light & Dark — placeholder]`
- `[Slide-in Cart Drawer & Coupon Validation — placeholder]`
- `[Demo Checkout Dialog & Mobile View — placeholder]`
