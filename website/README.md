# System Builder — marketing site

A static, dependency-free landing page. No build step: `index.html` + `styles.css` + `assets/`.

## Deploying

Point any static host at this folder:

- **Vercel / Netlify**: new project, set "Root Directory" (Netlify: "Base directory") to `website`, no build command, publish directory `.`.
- **GitHub Pages**: enable Pages on the repo, source = this folder (or copy its contents to a `gh-pages` branch root).

Either way you get a URL in minutes; point your own domain at it once you have one.

## Before this actually goes live, wire up these two TODOs in `index.html`

1. **Steam link** (`#steam-cta`, `#steam-cta-2`): currently `href="#"`. Replace with your real
   Steamworks store page URL once it exists — see the Steam checklist below.
2. **Email capture** (`.email-form`): the form is intentionally inert (`onsubmit="return false;"`,
   submit button `disabled`) rather than silently swallowing real signups. Pick a
   no-backend service — Buttondown, Formspree, a Mailchimp/ConvertKit embed — and:
   - point `action` at the real endpoint
   - remove `onsubmit="return false;"`
   - remove `disabled` from the submit button

## Steam checklist (the part only you can do)

1. Create a Steamworks partner account and pay the one-time $100 Steam Direct fee
   (refundable after the app earns $1,000). Requires business/tax verification and a
   payout bank account.
2. Fill in the app admin: store page copy, capsule images (Steam has fixed pixel
   dimensions for these — check current specs in Steamworks docs), a trailer,
   screenshots, tags, system requirements, price.
3. Submit for "coming soon" review — once approved, the store page is live and can
   start collecting wishlists even before launch. Wishlist count before launch is one
   of the biggest levers for Steam's discovery algorithm, so getting this page live
   early (even with a placeholder release date) matters more than having the full game
   finished.
4. Swap the real store URL into this site's two `#steam-cta` links.
5. Upload builds via SteamPipe (their build/deploy tool) when ready to ship.

None of step 1 can be done on your behalf — it needs your identity/business
verification and bank details.
