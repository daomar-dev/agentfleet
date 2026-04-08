## Why

The Lattix web dashboard at `lattix.code365.xyz` is a client-rendered SPA with hash-based routing. Search engines that don't execute JavaScript see only a bare `<title>Lattix</title>` and no description, no Open Graph tags, no structured data, no `robots.txt`, and no `sitemap.xml`. This means the dashboard is effectively invisible to search engines and social media link previews show nothing useful. Adding foundational SEO will improve discoverability for developers searching for distributed agent orchestration tools, and will make shared links display rich previews on Twitter, LinkedIn, Slack, and other platforms.

## What Changes

- Add static `<meta name="description">` to `index.html` so crawlers that don't execute JS still get a description
- Add Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) to `index.html`
- Add Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) to `index.html`
- Add `<link rel="canonical">` to `index.html`
- Create `robots.txt` in `web/public/` allowing all crawlers
- Create `sitemap.xml` in `web/public/` listing the main public page and the donation page
- Add JSON-LD structured data (`SoftwareApplication` schema) to `index.html`
- Create an OG image asset (`og-image.png`) for social previews
- Update `initI18n()` to also update OG/Twitter tags dynamically for Chinese users (progressive enhancement — the static English values serve as the fallback)

## Non-Goals

- Server-side rendering (SSR) or prerendering: the dashboard requires MSAL auth so most content is behind login anyway; static meta tags on the landing page are sufficient.
- Migrating from hash-based to history-based routing: this would require server-side configuration (GitHub Pages 404 fallback), and the authenticated routes have no SEO value.

## Capabilities

### New Capabilities
- `web-seo-meta`: Static and dynamic meta tags (description, OG, Twitter Card, canonical link) for the web dashboard
- `web-seo-structured-data`: JSON-LD structured data (SoftwareApplication schema) embedded in the dashboard
- `web-seo-crawl-assets`: robots.txt and sitemap.xml for the web dashboard

### Modified Capabilities
<!-- No existing spec-level behavior changes -->

## Impact

- **Files modified**: `web/index.html`, `web/src/i18n.ts`, locale JSON files (`web/src/locales/en-US.json`, `web/src/locales/zh-CN.json`)
- **Files created**: `web/public/robots.txt`, `web/public/sitemap.xml`, `web/public/og-image.png`
- **Dependencies**: None — all changes use static HTML and vanilla JS already in the stack
- **Testing**: Add Vitest tests to verify meta tag injection, OG tag content, and JSON-LD output; locale parity tests already enforce key matching
