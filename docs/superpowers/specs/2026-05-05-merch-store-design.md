# Merch Store — Design Spec
**Date:** 2026-05-05
**Status:** Approved

## Overview

Add a print-on-demand merch store to bobdavismusic.com. No inventory management. Visitors browse and buy from a dedicated merch page that matches the existing site aesthetic. Fulfillment is handled entirely by Printful.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Fulfillment | Printful | POD, supports Yupoong Classic hats, already integrated |
| Storefront/checkout | Shopify Starter ($5/mo) | Embeddable buy buttons for static HTML sites; native Printful sync |
| Hosting | Existing static site | No new infrastructure needed |

## Products

- Starting with 2 Yupoong Classic hats (already live in Shopify/Printful)
- Designed to scale to 3-6 products without layout changes

## Files Changed

| File | Change |
|---|---|
| `index.html` | Add "Merch" section immediately after the "Connect" section |
| `merch.html` | New page — product grid with Shopify buy button embeds |

No game files, no build step, no new dependencies beyond the Shopify buy button JavaScript snippet.

## Homepage Change (`index.html`)

A new section placed directly after "Connect" and before "Support the Music":

```html
<section>
  <p class="section-label">Merch</p>
  <div class="links">
    <a class="link-btn merch" href="merch.html">Bob Davis Merch</a>
  </div>
</section>
```

Button color: warm amber (`rgba(205,150,50,0.12)` background, `rgba(205,150,50,0.35)` border, `#d4a853` text) — distinct from the social buttons but consistent with the gold-and-dark palette.

## Merch Page (`merch.html`)

Matches `index.html` exactly: `#0d0608` background, `#FFD700` gold, Georgia serif.

**Structure top to bottom:**
1. Back link — top-left, `← Bob Davis` → `index.html`
2. Section label — `MERCH` in small-caps, muted, letter-spaced
3. Product grid — CSS grid, 2 columns desktop / 1 column mobile
4. Cart note — small italic text: "Add multiple items — one checkout, one shipping charge"
5. Footer — matches main site footer

**Product card contents:**
- Product image (square, rounded corners, subtle gold border glow on hover)
- Product name (gold, Georgia serif)
- Price (muted cream/amber, italic)
- Shopify "Add to Cart" button (dark bg, gold border, gold text — matches site palette)

**Grid scaling:**
- 1 product: `grid-template-columns: 1fr`, centered, max-width ~300px (hero treatment)
- 2-3 products: `grid-template-columns: 1fr 1fr`
- 4-6 products: `grid-template-columns: 1fr 1fr` (wraps naturally)

## Shopify Buy Button Integration

Each product gets its own Shopify buy button JavaScript snippet (generated in the Shopify admin under Sales Channels > Buy Button). All buttons on the same page share a single cart instance automatically.

**Button mode:** "Add to Cart" (not "Buy Now") so:
- Cart opens as a slide-in drawer overlaying `merch.html`
- Visitors can add multiple products before checking out
- Single checkout = single shipping charge
- Checkout itself redirects to `checkout.shopify.com` (standard; unavoidable at any Shopify tier)

**Styling:** The Shopify buy button embed will be wrapped in a container div. The default Shopify button styles will be overridden via CSS to match the site's dark/gold aesthetic.

## Responsive Behavior

- Mobile (<480px): single-column grid, cards full width
- Desktop: 2-column grid, max-width 480px centered

## Out of Scope

- Custom domain for checkout (requires Shopify Basic at $29/mo)
- Product detail pages (Shopify handles this in the cart drawer)
- Search or filtering (not needed at 2-6 products)
- Email capture / mailing list integration
