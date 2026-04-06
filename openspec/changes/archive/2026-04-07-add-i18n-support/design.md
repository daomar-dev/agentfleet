## Context

Lattix has approximately 60-80 user-facing strings in the CLI (command help, console output, log messages, error messages) and 80-100 strings in the web dashboard (component HTML templates, toast messages, form labels). All are hardcoded as inline English string literals. There is no existing i18n infrastructure.

The CLI uses Commander.js with `.description()` and `.option()` calls containing English text, plus `console.log()` calls with emoji-prefixed template literals. The web dashboard is a vanilla TypeScript SPA where all text lives in `innerHTML` template literals inside component files.

The project targets two locales: en-US (default) and zh-CN. CLI locale is determined by OS language; web locale is determined by browser language.

## Goals / Non-Goals

**Goals:**
- Establish a lightweight i18n system for both CLI and web with no new runtime dependencies
- Support en-US and zh-CN with auto-detection and en-US fallback
- Keep the message catalog format simple (flat JSON with dot-notation keys)
- Maintain existing emoji usage as locale-independent visual indicators
- Provide a bilingual README following GitHub conventions
- Make it straightforward to add more locales in the future

**Non-Goals:**
- Full ICU/CLDR-level internationalization (complex plurals, gender agreement, RTL layout)
- Runtime language switching in CLI (locale is detected once at startup)
- Framework-level i18n (no i18next, vue-i18n, or similar libraries)
- Translating log file content that is meant for debugging (internal debug messages stay English)
- Translating OpenSpec artifacts, CLAUDE.md, or developer-facing documentation
- Number formatting (not user-visible at current scale)

## Decisions

### 1. Flat JSON message catalogs with dot-notation keys

Message catalogs will be flat JSON objects with dot-notation keys:

```json
{
  "run.starting": "Lattix - Starting",
  "run.already_running": "Lattix is already running (PID {pid})",
  "status.header": "Tasks ({count} total)"
}
```

**Rationale**: Flat keys are simpler to grep, diff, and validate for completeness. Nested JSON adds structural complexity without meaningful benefit at this scale (~150 total keys). Dot notation provides logical grouping without nesting.

**Alternatives considered**: 
- Nested JSON (e.g., `{ run: { starting: "..." } }`) -- adds complexity for key access, harder to validate completeness across locales.
- gettext/PO files -- overkill for two locales and ~150 strings; adds tooling requirements.

### 2. Simple `t()` function with template interpolation

A shared `t(key, params?)` function performs lookup and interpolation:

```typescript
function t(key: string, params?: Record<string, string | number>): string {
  let msg = messages[key] ?? fallback[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}
```

**Rationale**: This is the minimal viable approach -- no dependencies, easy to understand, and sufficient for the two-locale, ~150-key scope. The fallback chain (current locale -> en-US -> raw key) ensures the app never shows blank text.

**Alternatives considered**:
- i18next library -- powerful but adds a dependency and configuration overhead that isn't justified for two locales.
- Tagged template literals (`` t`string ${value}` ``) -- clever but harder to extract keys and less tooling-friendly.

### 3. CLI locale detection via OS environment

CLI locale detection order:
1. `LATTIX_LANG` environment variable (explicit override)
2. `Intl.DateTimeFormat().resolvedOptions().locale` (Node.js built-in, reflects OS locale)
3. Falls back to `en-US`

If the detected locale starts with `zh`, use `zh-CN`; otherwise use `en-US`.

**Rationale**: `Intl` is built into Node.js and accurately reflects the OS display language on Windows, macOS, and Linux. The `LATTIX_LANG` env var provides an escape hatch for users who want a different language than their OS.

### 4. Web locale detection via navigator.language

Web locale detection order:
1. `localStorage.getItem('lattix-lang')` (user preference, for potential future settings toggle)
2. `navigator.language` (browser language)
3. Falls back to `en-US`

Same mapping: starts with `zh` -> `zh-CN`, otherwise `en-US`.

**Rationale**: `navigator.language` is the standard browser API and matches user expectations. localStorage provides future extensibility if a language toggle is added to settings.

### 5. Separate message catalogs for CLI and web

CLI catalogs: `src/locales/en-US.json`, `src/locales/zh-CN.json`
Web catalogs: `web/src/locales/en-US.json`, `web/src/locales/zh-CN.json`

Each surface has its own `i18n.ts` module exporting the `t()` function.

**Rationale**: CLI and web have completely different string sets. Sharing a single catalog would force the web bundle to include CLI-only strings and vice versa. Separate catalogs are independently deployable and keep bundle size minimal.

### 6. Bilingual README via separate file with cross-links

Keep `README.md` in English, add `README.zh-CN.md` in Chinese. Both include a language switcher line at the top: `[English](README.md) | [简体中文](README.zh-CN.md)`.

**Rationale**: This is the established GitHub convention. GitHub natively renders the language links. A single README with both languages would be unwieldy at ~600 lines.

### 7. Commander.js integration approach

Commander.js `.description()` and `.option()` calls will use `t()` lookups. The `t()` module must be initialized (locale detected, catalog loaded) before Commander parses arguments. Since locale detection is synchronous (env var or `Intl`), this is straightforward -- just import the i18n module at the top of `cli.ts`.

```typescript
import { t } from './services/i18n';

program
  .name('lattix')
  .description(t('cli.description'))
```

### 8. Locale-aware date/time formatting via Intl

All user-facing dates and relative times will use `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` with the active locale. Two helper functions will be provided:

```typescript
function formatDate(date: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));
}

function formatRelativeTime(date: Date | string, locale: string): string {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  // pick appropriate unit (seconds, minutes, hours, days)
  if (seconds < 60) return rtf.format(-seconds, 'second');
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute');
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), 'hour');
  return rtf.format(-Math.round(seconds / 86400), 'day');
}
```

**Rationale**: `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` are built into Node.js (>=14) and all modern browsers. They handle locale-specific formatting natively -- e.g., `2025年1月5日` for zh-CN, `Jan 5, 2025` for en-US, and `2小时前` vs `2 hours ago`. No library needed.

**Alternatives considered**:
- date-fns/locale or dayjs/locale -- adds dependencies for functionality already built into the runtime.
- Manual format strings in the message catalog -- fragile, doesn't handle relative time, and reinvents what Intl already provides.

### 9. CLI `--json` output stability guarantee

The `--json` flag output on CLI commands (e.g., `lattix status --json`) SHALL remain in English and locale-independent. Only human-readable text output is affected by locale detection. This ensures scripts and CI pipelines that parse CLI output are not broken by i18n changes.

The `LATTIX_LANG` environment variable is documented as the override mechanism for scripts that need deterministic text output (e.g., `LATTIX_LANG=en-US lattix status`).

**Rationale**: Machine-parseable output must be stable. Localizing JSON keys or structured output would be a breaking change for any automation built on top of Lattix.

### 10. Dynamic HTML `lang` attribute and meta tag localization

On page load, the web i18n module will set `document.documentElement.lang` to the detected locale (`en-US` or `zh-CN`). It will also update `<meta name="description">` and `<title>` using localized values from the message catalog.

```typescript
document.documentElement.lang = locale;
document.title = t('meta.title');
document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
```

**Rationale**: The `lang` attribute is critical for accessibility -- screen readers use it to select the correct voice/pronunciation engine. Search engines also use it for language classification. Implementation cost is trivial (3 lines).

### 11. Donation page locale-aware channel ordering

`donate.html` is a standalone static HTML page (not part of the SPA). It will include a small inline `<script>` that detects `navigator.language`, and uses CSS `order` to swap the two `.channel-card` elements: WeChat Pay first for `zh-*` users, PayPal first for others. Header text (`Support Lattix` / `支持 Lattix`) and footer text will also switch based on locale.

```javascript
if (navigator.language.startsWith('zh')) {
  document.documentElement.lang = 'zh-CN';
  document.querySelector('.wechat-card').style.order = '-1';
  // swap header/footer text to Chinese
}
```

**Rationale**: The donation page is static HTML with no build step. A lightweight inline script is the simplest approach -- no bundler, no i18n module import. The text volume is small (~5 strings) so a full catalog is overkill. Reordering payment channels by locale directly impacts donation conversion.

### 12. Chinese font stack in CSS

The CSS `--font-family` variable and `donate.html` font-family will be updated to include Chinese font fallbacks:

```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  'Microsoft YaHei', 'PingFang SC', sans-serif;
```

**Rationale**: Default `sans-serif` on Windows may fall back to SimSun (a serif font) for Chinese characters, causing visual inconsistency. Adding `Microsoft YaHei` (Windows) and `PingFang SC` (macOS/iOS) ensures consistent sans-serif Chinese rendering. Zero runtime cost -- purely a CSS declaration change.

### 13. PWA manifest localization

The `manifest.json` `description` field will be updated to a generic bilingual-friendly description. Since PWA manifests don't natively support runtime locale switching, the web app will dynamically set `<link rel="manifest">` to point to a locale-specific manifest generated at runtime via a data URL, or simply update the `description` to the localized value. A pragmatic approach: keep a single `manifest.json` with the English name (brand name is universal) and set `lang` field to match the detected locale.

**Rationale**: PWA install UX benefits from a localized description, but the `name` and `short_name` ("Lattix") are brand identifiers and should remain unchanged. The manifest `lang` field helps the OS display the correct text direction.

### 14. npm package keyword expansion

Add Chinese keywords to `package.json` `keywords` array:

```json
"keywords": [
  "agent", "orchestration", "distributed", "decentralized",
  "onedrive", "multi-machine", "coding-agent",
  "分布式", "智能体", "编排", "多机器", "代理"
]
```

**Rationale**: npm search indexes keywords. Chinese developers searching for `分布式` or `智能体` will find Lattix. Zero cost, no behavior change, pure discoverability improvement.

## Test Strategy

**Test-first approach**: Tests for the i18n module will be written before implementation.

**Failing tests to add before implementation:**

1. **`test/i18n.test.js`** -- CLI i18n module:
   - `t()` returns English string for known key
   - `t()` returns Chinese string when locale is zh-CN
   - `t()` performs parameter interpolation (`{pid}`, `{count}`, etc.)
   - `t()` falls back to en-US when key is missing in current locale
   - `t()` returns raw key when key is missing in all locales
   - Locale detection respects `LATTIX_LANG` environment variable
   - Locale detection maps `zh-*` to `zh-CN` and everything else to `en-US`
   - `formatDate()` produces locale-appropriate date strings (e.g., `2025年1月5日` for zh-CN)
   - `formatRelativeTime()` produces locale-appropriate relative times (e.g., `2小时前` for zh-CN)

2. **`test/i18n-catalog.test.js`** -- Catalog validation:
   - en-US and zh-CN catalogs have identical key sets
   - All keys used in source files exist in the catalogs
   - No unused keys in catalogs (optional, can be added later)

3. **`web/src/i18n.test.ts`** -- Web i18n module:
   - Same behavioral tests as CLI but for browser environment
   - Verifies localStorage preference takes precedence over navigator.language
   - Verifies `document.documentElement.lang` is set to detected locale
   - Verifies `formatDate()` and `formatRelativeTime()` produce locale-appropriate output

**Existing test updates:**
- CLI command tests that assert on specific output strings will need updating to use locale-aware assertions or set `LATTIX_LANG=en-US` in test environment.

## Risks / Trade-offs

- **[Large diff surface]** -> Every command handler and web component file must be touched. Mitigation: Implement in phases (i18n module first, then CLI commands, then web components) with catalog validation tests ensuring no keys are missed.
- **[String drift]** -> Future PRs may add hardcoded strings instead of using `t()`. Mitigation: Add a catalog validation test that checks for common patterns (`console.log('` without `t(`) in command files. Document the i18n pattern in CLAUDE.md.
- **[Translation quality]** -> Machine-translated strings may sound unnatural. Mitigation: The zh-CN catalog will be human-reviewed. The scope is small (~150 strings) making review feasible.
- **[Template literal complexity]** -> Some web component strings are deeply embedded in multi-line HTML template literals with interpolation. Mitigation: Extract strings incrementally, keeping the HTML structure in template literals but replacing text content with `t()` calls.
- **[Test maintenance]** -> Tests that check exact console output will break. Mitigation: Set `LATTIX_LANG=en-US` in test fixtures to ensure deterministic output.
- **[Donation page complexity]** -> Adding inline JS to a static HTML page increases maintenance surface. Mitigation: The script is ~15 lines with no external dependencies; the text volume is small (~5 strings). If the page grows, migrate to the SPA.
- **[Intl API consistency]** -> `Intl.RelativeTimeFormat` output varies slightly across Node.js versions and browsers. Mitigation: Tests assert on format characteristics (contains Chinese characters, contains the number) rather than exact strings.
