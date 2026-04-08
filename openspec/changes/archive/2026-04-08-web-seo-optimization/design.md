## Context

The Lattix web dashboard (`lattix.code365.xyz`) is a vanilla TypeScript SPA deployed on GitHub Pages. It uses hash-based routing (`#/path`), MSAL.js for Microsoft Entra ID authentication, and has no backend. Currently the `index.html` contains only a bare `<title>Lattix</title>` with no meta description, no Open Graph tags, no structured data, no `robots.txt`, and no `sitemap.xml`. The `<meta name="description">` is injected dynamically by JavaScript in `initI18n()`, making it invisible to crawlers that don't execute JS.

The dashboard is behind authentication for most routes, so deep-link SEO for `/tasks` or `/settings` has no value. The SEO target is the landing page (pre-auth) and the public `donate.html` page.

## Goals / Non-Goals

**Goals:**
- Make the landing page indexable by all major search engines with correct title, description, and keywords
- Display rich previews when the URL is shared on social platforms (Twitter, LinkedIn, Slack, Teams, WeChat)
- Provide structured data so search engines understand Lattix is a software application
- Allow crawlers to discover the public pages via `robots.txt` and `sitemap.xml`
- Maintain i18n support: Chinese users get localized meta tags via progressive enhancement

**Non-Goals:**
- Server-side rendering (SSR) or static-site generation — the SPA architecture stays as-is
- History-mode routing — hash routes stay; only the landing page needs SEO
- SEO for authenticated pages — these are user-specific and have no public value
- Paid search or advertising — this is organic SEO only

## Decisions

### 1. Static meta tags in `index.html` + dynamic override in JS

**Decision:** Place all critical meta tags (description, OG, Twitter Card, canonical, JSON-LD) directly in `index.html` as static English defaults. `initI18n()` updates them for Chinese users at runtime.

**Rationale:** Crawlers like Googlebot execute JS but many social media scrapers (Slack, LinkedIn, Twitter, WeChat) do not. Static tags guarantee baseline previews everywhere. The JS override is progressive enhancement for runtime language detection.

**Alternative considered:** Only dynamic tags via JS — rejected because social media crawlers would see empty previews.

### 2. JSON-LD for structured data (SoftwareApplication)

**Decision:** Embed a `<script type="application/ld+json">` block in `index.html` with `SoftwareApplication` schema.

**Rationale:** JSON-LD is Google's recommended format for structured data. `SoftwareApplication` accurately describes Lattix. Fields: `name`, `description`, `applicationCategory`, `operatingSystem`, `url`, `offers` (free), `author`.

**Alternative considered:** Microdata (`itemscope`/`itemprop`) — rejected; harder to maintain in a SPA and less readable.

### 3. Minimal `sitemap.xml` with two entries

**Decision:** A static `sitemap.xml` with two URLs: the landing page (`/`) and the donation page (`/donate.html`).

**Rationale:** Hash-based routes are not indexable and authenticated content has no SEO value. Only the two public-facing pages belong in the sitemap.

### 4. OG image as a static asset

**Decision:** Create a `web/public/og-image.png` (1200x630px) showing the Lattix logo, name, and tagline on a branded blue background. Reference it with an absolute URL in the OG tags.

**Rationale:** Social platforms require an absolute image URL. A static pre-built image avoids runtime generation complexity. The 1200x630 dimension is the standard for OG images across all platforms.

### 5. CSP update for OG image

**Decision:** The existing `img-src 'self' data:` CSP directive already covers a self-hosted OG image. No CSP changes needed.

## Test Strategy

- **Meta tag tests (Vitest + jsdom):** Verify that after `initI18n()` runs, the DOM contains correct `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`, `<meta name="twitter:card">`, `<link rel="canonical">`, and `<script type="application/ld+json">` elements
- **Locale parity tests:** Existing tests enforce that `en-US.json` and `zh-CN.json` have identical key sets; new OG/Twitter i18n keys will be covered automatically
- **Static file tests:** Verify `robots.txt` and `sitemap.xml` exist in the build output and contain expected content (build-time validation)
- **JSON-LD validation:** Parse the embedded JSON-LD and assert the schema type, required fields, and URL correctness

## Risks / Trade-offs

- **[Risk] GitHub Pages doesn't support custom HTTP headers for OG tags** → Mitigation: All OG tags are in-page `<meta>` elements, which don't require HTTP headers. GitHub Pages serves static files fine.
- **[Risk] OG image URL must be absolute** → Mitigation: Hardcode `https://lattix.code365.xyz/og-image.png` in the meta tag. If the domain changes, this tag needs updating.
- **[Risk] Hash-based routing limits per-page SEO** → Accepted trade-off: Only the landing page needs SEO. Authenticated pages have no public search value. This is documented as a non-goal.
- **[Risk] Dynamic meta tag updates may flash English before switching to Chinese** → Mitigation: `initI18n()` runs early in the boot sequence, before the app renders. The flash is negligible.
