## 1. CLI i18n Core Module

- [x] 1.1 Write tests for CLI i18n module (`test/i18n.test.js`): `t()` lookup, parameter interpolation, fallback chain, locale detection via `LATTIX_LANG` env var, `zh-*` mapping to `zh-CN`, default to `en-US`, `formatDate()` locale output, `formatRelativeTime()` locale output
- [x] 1.2 Create `src/services/i18n.ts` with `t(key, params?)` function, `detectLocale()`, catalog loading logic, `formatDate(date, locale)`, and `formatRelativeTime(date, locale)` helpers using `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`
- [x] 1.3 Create `src/locales/en-US.json` with all CLI user-facing strings extracted from commands and services (use dot-notation keys grouped by module: `cli.*`, `run.*`, `submit.*`, `status.*`, `stop.*`, `install.*`, `uninstall.*`, `bootstrap.*`, `daemon.*`, `logger.*`)
- [x] 1.4 Create `src/locales/zh-CN.json` with Chinese translations for all keys in en-US.json
- [x] 1.5 Write catalog validation test (`test/i18n-catalog.test.js`): verify en-US and zh-CN have identical key sets

## 2. CLI Command Localization

- [x] 2.1 Update `src/cli.ts` to import i18n and use `t()` for program description, all command descriptions, and all option descriptions
- [x] 2.2 Update `src/commands/run.ts` to use `t()` for all console.log/console.error output strings
- [x] 2.3 Update `src/commands/submit.ts` to use `t()` for all output strings
- [x] 2.4 Update `src/commands/status.ts` to use `t()` for all output strings including table headers, and use `formatDate()`/`formatRelativeTime()` for all timestamp displays
- [x] 2.5 Update `src/commands/stop.ts` to use `t()` for all output strings
- [x] 2.6 Update `src/commands/install.ts` to use `t()` for all output strings
- [x] 2.7 Update `src/commands/uninstall.ts` to use `t()` for all output strings

## 3. CLI Service Localization

- [x] 3.1 Update `src/services/bootstrap.ts` to use `t()` for user-facing messages (OneDrive detection prompts, error messages)
- [x] 3.2 Update `src/services/daemon.ts` to use `t()` for user-facing log and console messages
- [x] 3.3 Update `src/services/logger.ts` to use `t()` for user-facing log messages (keep debug/internal messages in English)
- [x] 3.4 Update `src/services/version-checker.ts` to use `t()` for update notification banner
- [x] 3.5 Update any other services with user-facing strings (`task-watcher.ts`, `agent-executor.ts`, `result-writer.ts`, `setup.ts`) to use `t()`
- [x] 3.6 Ensure JSON catalog files are copied to `dist/locales/` during build (update `tsconfig.json` or add a copy step)

## 4. Web Dashboard i18n Core Module

- [x] 4.1 Write tests for web i18n module (`web/src/i18n.test.ts`): `t()` lookup, parameter interpolation, fallback chain, localStorage preference, navigator.language detection, `zh-*` mapping, `formatDate()` locale output, `formatRelativeTime()` locale output, `document.documentElement.lang` setting
- [x] 4.2 Create `web/src/i18n.ts` with `t(key, params?)` function, `detectLocale()` for browser environment, `formatDate()` and `formatRelativeTime()` helpers, and initialization logic that sets `document.documentElement.lang`, `<title>`, and `<meta name="description">`
- [x] 4.3 Create `web/src/locales/en-US.json` with all web component user-facing strings (grouped by component: `login.*`, `navbar.*`, `home.*`, `taskList.*`, `taskDetail.*`, `settings.*`)
- [x] 4.4 Create `web/src/locales/zh-CN.json` with Chinese translations for all keys in en-US.json

## 5. Web Component Localization

- [x] 5.1 Update `web/src/components/login.ts` to use `t()` for tagline and sign-in button text
- [x] 5.2 Update `web/src/components/navbar.ts` to use `t()` for nav labels, slogan, account type labels, logout button
- [x] 5.3 Update `web/src/components/home.ts` to use `t()` for section headers, form labels, placeholders, hints, button text, empty states, onboarding text, and toast messages; use `formatRelativeTime()` for "Last active" displays
- [x] 5.4 Update `web/src/components/task-list.ts` to use `t()` for headers, empty states, button text
- [x] 5.5 Update `web/src/components/task-detail.ts` to use `t()` for labels, table headers, navigation text, empty states, and use `formatDate()`/`formatRelativeTime()` for all timestamp displays
- [x] 5.6 Update `web/src/components/settings.ts` to use `t()` for section headers, descriptions, form hints, button text

## 6. Web Dashboard Presentation and SEO

- [x] 6.1 Update `web/styles/main.css` CSS `--font-family` variable to include Chinese font fallbacks: `"Microsoft YaHei"`, `"PingFang SC"` before `sans-serif`
- [x] 6.2 Update `web/public/manifest.json` to add `lang` field and localize `description`; update `web/src/i18n.ts` initialization to dynamically generate locale-specific manifest via data URL or update the link
- [x] 6.3 Ensure `web/src/index.ts` calls i18n initialization early so `<html lang>`, `<title>`, and `<meta description>` are set before component rendering

## 7. Donation Page Localization

- [x] 7.1 Update `web/public/donate.html` to add inline `<script>` that detects `navigator.language` and reorders payment channels (WeChat first for zh-CN, PayPal first for others) via CSS `order`
- [x] 7.2 Add locale-aware header/footer text switching in `donate.html` (English/Chinese for "Support Lattix" heading, subtitle, and footer)
- [x] 7.3 Update `donate.html` CSS `font-family` to include Chinese font fallbacks (`"Microsoft YaHei"`, `"PingFang SC"`)
- [x] 7.4 Set `<html lang>` dynamically in `donate.html` based on detected locale

## 8. Bilingual README

- [x] 8.1 Create `README.zh-CN.md` with full Chinese translation of README.md (preserving code examples, CLI commands, and file paths as-is)
- [x] 8.2 Add language switcher line to the top of `README.md`: `[English](README.md) | [简体中文](README.zh-CN.md)`
- [x] 8.3 Add language switcher line to the top of `README.zh-CN.md`: `[English](README.md) | [简体中文](README.zh-CN.md)`

## 9. npm Package Discoverability

- [x] 9.1 Add Chinese keywords to `package.json` `keywords` array: `"分布式"`, `"智能体"`, `"编排"`, `"多机器"`, `"代理"`

## 10. Documentation and CLAUDE.md Update

- [x] 10.1 Update `CLAUDE.md` to document the i18n pattern: how to add new strings using `t()`, where catalogs are located, the requirement to add keys to both locale files, and the `LATTIX_LANG` override for scripts
- [x] 10.2 Review and update any other developer-facing docs that reference hardcoded strings

## 11. Verification

- [x] 11.1 Run `npm run build` in root and verify CLI compiles successfully with i18n module and locale files included in dist/
- [x] 11.2 Run `npm test` in root and verify all CLI tests pass (including new i18n tests)
- [x] 11.3 Run `npm run build` in web/ and verify web dashboard builds successfully
- [x] 11.4 Run `npm test` in web/ and verify all web tests pass (including new i18n tests)
- [x] 11.5 Manual smoke test: run `LATTIX_LANG=zh-CN npx lattix --help` and verify Chinese output
- [x] 11.6 Manual smoke test: run `npx lattix --help` with default locale and verify English output
- [x] 11.7 Manual smoke test: open donate.html in a browser with zh-CN locale and verify WeChat Pay appears first with Chinese text
- [x] 11.8 Manual smoke test: verify web dashboard sets `<html lang>` correctly and page title is localized
