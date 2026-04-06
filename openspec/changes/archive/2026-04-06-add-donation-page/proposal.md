## Why

Lattix currently only offers PayPal as a donation channel (via `.github/FUNDING.yml`), which works well for international users but is inaccessible to Chinese users. Adding a WeChat Pay donation option with a dedicated donation page will make it easy for supporters in China to contribute. A donation page also consolidates both channels in one place and gives the project a visible "support" presence it currently lacks.

## What Changes

- **New standalone donation page** (`web/public/donate.html`): A static HTML page (no authentication required) presenting two donation channels side by side — PayPal (in English) for international users and WeChat Pay (in Chinese) for Chinese users. The WeChat section displays the existing QR code image.
- **Desktop navbar donation link**: Add a "Donate" navigation link to the desktop navbar that opens the donation page. This link is only visible on desktop — not in the mobile bottom tab bar.
- **Settings page donation link**: Add a "Support Lattix" link in the Settings > About section, providing mobile users (and all users) an entry point to the donation page.
- **GitHub funding configuration update**: Update `.github/FUNDING.yml` to include the donation page URL alongside the existing PayPal link.
- **README donation section**: Add a brief "Support" section to `README.md` mentioning both donation channels with a link to the donation page.

### Non-goals

- No payment processing, callbacks, or server-side logic — both channels are external (PayPal link + WeChat QR code).
- No donor information collection form — the WeChat QR code already handles this, and donor data is processed manually.
- No internationalization framework — the donation page uses English as default with Chinese only for the WeChat section.

## Capabilities

### New Capabilities

- `web-donation-page`: Standalone static donation page presenting PayPal and WeChat Pay channels, accessible without authentication.

### Modified Capabilities

_None — this change adds a new page and navigation links without altering existing spec-level behavior._

## Impact

- **Web dashboard**: `navbar.ts` gains a desktop-only donation link; `settings.ts` gains a "Support Lattix" link in the About section.
- **Static assets**: New `donate.html` in `web/public/`; existing `wechat-donation.jpg` needs to be git-tracked.
- **Repository config**: `.github/FUNDING.yml` and `README.md` updated.
- **No dependency changes**: Pure HTML/CSS static page, no new packages required.
- **Testing impact**: Minimal — navbar test may need updating to account for the new link. The donation page itself is static HTML with no logic to test.
