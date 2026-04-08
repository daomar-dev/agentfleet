## 1. Static Assets

- [x] 1.1 Create `web/public/robots.txt` with `User-agent: *`, `Allow: /`, and `Sitemap: https://lattix.code365.xyz/sitemap.xml`
- [x] 1.2 Create `web/public/sitemap.xml` with entries for `/` and `/donate.html` conforming to the Sitemaps.org protocol
- [x] 1.3 Create `web/public/og-image.png` (1200x630px) with Lattix logo, name, and tagline on branded blue background

## 2. HTML Meta Tags

- [x] 2.1 Add static `<meta name="description">` to `web/index.html` with English description
- [x] 2.2 Add Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) to `web/index.html`
- [x] 2.3 Add Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) to `web/index.html`
- [x] 2.4 Add `<link rel="canonical" href="https://lattix.code365.xyz/">` to `web/index.html`
- [x] 2.5 Add `<script type="application/ld+json">` block with `SoftwareApplication` schema to `web/index.html`

## 3. i18n Locale Keys

- [x] 3.1 Add OG/Twitter meta content keys to `web/src/locales/en-US.json` (e.g., `meta.ogTitle`, `meta.ogDescription`)
- [x] 3.2 Add matching keys to `web/src/locales/zh-CN.json` with Chinese translations

## 4. Dynamic Meta Tag Update

- [x] 4.1 Update `initI18n()` in `web/src/i18n.ts` to set/update `og:title`, `og:description`, `twitter:title`, and `twitter:description` meta tags from locale keys

## 5. Tests

- [x] 5.1 Write Vitest test: verify `index.html` contains static `<meta name="description">`, OG tags, Twitter Card tags, canonical link, and JSON-LD block
- [x] 5.2 Write Vitest test: verify `initI18n()` updates OG and Twitter meta tags with localized content for `zh-CN`
- [x] 5.3 Write Vitest test: verify JSON-LD parses as valid JSON with correct `@context`, `@type`, `name`, and `url` fields
- [x] 5.4 Verify `robots.txt` and `sitemap.xml` exist in build output after `npm run build` (in web/)

## 6. Verification

- [x] 6.1 Run `cd web && npm run build` and confirm no errors
- [x] 6.2 Run `cd web && npm test` and confirm all tests pass
- [x] 6.3 Verify locale key parity between `en-US.json` and `zh-CN.json`
