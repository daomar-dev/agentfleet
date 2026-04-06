## Why

Lattix currently has all user-facing text hardcoded as inline English string literals across the CLI, web dashboard, and README. As the tool gains adoption among Chinese-speaking developers and teams, the lack of localization creates a barrier. Adding simplified Chinese (zh-CN) alongside English (en-US) makes Lattix accessible to a significant user base while establishing a clean i18n foundation for future locales.

## What Changes

- **CLI internationalization**: Introduce a message catalog and locale-aware string lookup for all CLI help text, command output, log messages, and error messages. Locale is detected from the OS display language (`Intl.DateTimeFormat().resolvedOptions().locale` or environment variables). If zh-CN, use Chinese; otherwise fall back to en-US.
- **Web dashboard internationalization**: Introduce a browser-side message catalog and `t()` helper for all component text. Locale is detected from `navigator.language`. If zh-CN, use Chinese; otherwise fall back to en-US.
- **Bilingual README**: Create `README.zh-CN.md` alongside the existing English `README.md`, following GitHub's convention for multilingual documentation. Add cross-links between the two versions.
- **Shared i18n design**: Both CLI and web use JSON-based message catalogs with the same key structure and interpolation pattern, keeping the approach consistent across surfaces.
- **Date/time locale formatting**: All user-facing date and time displays (CLI status output, web dashboard timestamps like "Last active", "Created") will use `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` with the active locale, producing locale-appropriate formats (e.g., `2025年1月5日` vs `Jan 5, 2025`, `2小时前` vs `2 hours ago`).
- **CLI output stability**: The `--json` output flag remains locale-independent to preserve machine-parseable output. Document `LATTIX_LANG=en-US` as the stable override for scripts.
- **HTML lang attribute and meta tags**: The web dashboard's `<html lang>` attribute will be set dynamically to match the detected locale. `<title>` and `<meta name="description">` will be localized.
- **Donation page locale-aware layout**: The standalone `donate.html` page will detect browser locale and reorder payment channels accordingly -- WeChat Pay first for zh-CN users, PayPal first for others.
- **Chinese font stack**: CSS `font-family` will include Chinese font fallbacks (`"Microsoft YaHei", "PingFang SC"`) to ensure proper rendering.
- **PWA manifest localization**: The `manifest.json` `description` field will be updated, and the web app will set the manifest `lang` attribute dynamically based on detected locale.
- **npm package discoverability**: Add Chinese keywords to `package.json` `keywords` array for improved search visibility on npmjs.org.

## Capabilities

### New Capabilities
- `i18n-core`: Core internationalization infrastructure shared across CLI and web -- locale detection, message catalog format, string lookup with interpolation and pluralization, plus locale-aware date/time formatting helpers.
- `i18n-cli`: CLI-specific localization -- translated help text, command output, log messages, and error messages for en-US and zh-CN. Locale-formatted timestamps in status output. Stable `--json` output unaffected by locale.
- `i18n-web`: Web dashboard localization -- translated component text for all pages, browser locale detection, dynamic `<html lang>` and meta tags, locale-aware date/time formatting, donation page channel reordering by locale, Chinese font stack, and PWA manifest localization.
- `i18n-readme`: Bilingual README documentation -- zh-CN translation of README.md with cross-links between language versions.

### Modified Capabilities
- `cli-entrypoint`: Commander.js descriptions and option help text will be sourced from the i18n message catalog instead of hardcoded strings.
- `web-donation-page`: Donation page will detect browser locale and reorder payment channels (WeChat Pay first for zh-CN, PayPal first for others). Header and footer text will be localized.

## Impact

- **Code**: Every CLI command handler (`src/commands/*.ts`), several services (`src/services/logger.ts`, `bootstrap.ts`, `daemon.ts`, etc.), and all web components (`web/src/components/*.ts`) will be modified to use the `t()` lookup function instead of inline strings. `web/index.html` and `web/public/donate.html` will gain dynamic `lang` attribute setting. CSS will be updated for Chinese font fallbacks.
- **New files**: Message catalog JSON files for each locale (e.g., `src/locales/en-US.json`, `src/locales/zh-CN.json`, `web/src/locales/en-US.json`, `web/src/locales/zh-CN.json`), plus the i18n utility modules and `README.zh-CN.md`.
- **Modified files**: `package.json` (keywords), `web/public/manifest.json` (description), `web/index.html` (dynamic lang), `web/public/donate.html` (locale-aware layout), `web/styles/main.css` (font stack).
- **Dependencies**: No new runtime dependencies required. The i18n layer will be a lightweight custom implementation (~50-80 lines) using built-in `Intl` APIs for locale detection, date/time formatting, and relative time formatting.
- **Testing**: Existing tests need updates to account for localized output. New tests verify locale detection, message lookup, interpolation, pluralization, date/time formatting, and fallback behavior.
- **Build**: No build pipeline changes. JSON message catalogs are imported/bundled as-is.
