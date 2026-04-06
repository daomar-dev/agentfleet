## Context

The Lattix web dashboard is a vanilla TypeScript SPA served by Vite. It requires MSAL authentication for all routes. The navbar has two rendering modes: desktop (horizontal links in `.navbar-desktop-links`) and mobile (bottom tab bar in `.navbar-tabs`). Navigation links are currently: Home, Tasks, Settings.

The only existing donation channel is a PayPal link in `.github/FUNDING.yml`. There is no donation page, no donation UI in the dashboard, and no mention of donations in the README. A WeChat Pay QR code image (`web/public/wechat-donation.jpg`) is prepared but untracked.

## Goals / Non-Goals

**Goals:**
- Provide a standalone donation page accessible without authentication
- Present both PayPal and WeChat Pay channels clearly
- Add discoverable but unobtrusive navigation to the donation page
- Update repository metadata (FUNDING.yml, README) to reflect donation options

**Non-Goals:**
- Payment processing, webhooks, or server-side logic
- Donor information collection forms (WeChat handles this natively)
- Full i18n framework — only the WeChat section uses Chinese
- Donation page integration with the SPA router or MSAL auth

## Decisions

### 1. Static HTML file in `web/public/`

**Decision**: Create `donate.html` as a standalone static HTML file in `web/public/`, not as a SPA route.

**Rationale**: The donation page must be accessible without Microsoft authentication. Adding an auth-bypass route to the SPA router would require refactoring the router's authentication guard and coupling a static content page to the MSAL dependency. A standalone HTML file served by Vite is simpler, has zero dependencies, and works as a standalone link from GitHub, README, or external sites.

**Alternatives considered**:
- SPA route with auth bypass — requires router changes, adds complexity for a page with no dynamic behavior.
- Separate GitHub Pages site — maintenance overhead of a second deployment, overkill for a single page.

### 2. Two-column card layout

**Decision**: Use a side-by-side card layout with PayPal on the left and WeChat on the right, collapsing to stacked on mobile.

**Rationale**: The two channels serve different audiences (international vs. Chinese users). Side-by-side presentation makes the choice immediately clear. CSS Grid or Flexbox with `flex-wrap` handles the responsive collapse without JavaScript.

### 3. Desktop-only navbar link

**Decision**: Add a "Donate" link to the desktop `.navbar-desktop-links` div. It will be a standard `<a>` tag pointing to `/donate.html` with `target="_blank"` (since it exits the SPA). No link is added to the mobile bottom tab bar.

**Rationale**: Desktop has space for an additional link. The mobile bottom tab bar is limited to 3 tabs (Home, Tasks, Settings) and adding a 4th would reduce tap target size. Mobile users reach the donation page via the Settings > About link instead.

### 4. Settings page "Support" link

**Decision**: Add a "Support Lattix" link in the existing About section of `settings.ts`, inline with the GitHub and npm links.

**Rationale**: Keeps the entry point subtle and consistent with the existing link pattern. No new section needed — it fits naturally alongside "GitHub Repository" and "npm Package".

### 5. Self-contained page styling

**Decision**: The `donate.html` page includes its own inline `<style>` block rather than importing the dashboard's `main.css`.

**Rationale**: The donation page is independent of the SPA build pipeline. Inline styles keep it zero-dependency. The visual style will use the same color palette (brand blue `#0078d4`, grays) for consistency, but implemented independently.

## Risks / Trade-offs

- **Style drift**: The donation page's inline CSS may diverge from the dashboard's styles over time. → Mitigation: Use the same color variables and simple, minimal styling that's unlikely to need updates.
- **Discoverability on mobile**: Mobile users only see the donation link buried in Settings > About. → Mitigation: This is intentional per requirements — donation entry should be "subtle". Users who want to donate will find it.
- **Static file caching**: `donate.html` may be aggressively cached by browsers or CDNs. → Mitigation: Acceptable — the page content rarely changes. Cache-busting can be added later if needed.

## Test Strategy

This change is primarily static content with minimal behavior changes:

- **Navbar test update**: The existing `navbar.test.ts` should be updated to verify the desktop navbar renders 4 links (Home, Tasks, Settings, Donate) and the mobile tab bar still renders only 3 tabs (Home, Tasks, Settings).
- **Settings test**: A test should verify the About section contains a "Support Lattix" link pointing to `/donate.html`.
- **donate.html**: No automated tests needed — it's a static page with no JavaScript logic. Visual verification is sufficient.
- **Build verification**: Run `npm run build` in `web/` to ensure TypeScript changes compile. Run `npm test` in `web/` to verify existing and new tests pass.
