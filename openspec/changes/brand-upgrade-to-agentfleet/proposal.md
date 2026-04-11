## Why

Lattix is functionally complete but operates under a personal GitHub account (`chenxizhang/lattix`) with a generic npm package name (`lattix`), no organizational identity, and a subdomain of a personal domain (`lattix.code365.xyz`). This prevents the project from being perceived as a serious, commercially-viable open source product.

A new brand — **Daomar** (刀马 / 道码) — has been established to serve as the parent organization for multiple future developer tools. The brand carries dual cultural meaning: **刀马 (Dāo Mǎ)**, a swordsman from a story beloved by the founder's son, representing boldness and precision; and **道码 (Dào Mǎ)**, meaning "code with principle" or "the way of code", representing craftsmanship and technical honor.

**AgentFleet** is the first product under the Daomar brand. The name directly communicates the product's core value: orchestrating a fleet of AI coding agents across distributed machines.

This brand upgrade must be completed before any public launch or growth campaign (the existing `growth-to-1000-stars` change depends on this).

## What Changes

### Phase 0: Infrastructure setup

- Create the `daomar-dev/agentfleet` GitHub repository under the new organization.
- Configure Cloudflare DNS: `agentfleet.daomar.dev` CNAME to `daomar-dev.github.io`.
- Configure Cloudflare redirect: `daomar.dev` redirects to `https://github.com/daomar-dev`.
- Deprecate or unpublish the old `lattix` npm package.
- Update (or create new) Entra ID App Registration with redirect URI `https://agentfleet.daomar.dev/`.
- Create `daomar-dev.github.io` repo with a minimal brand landing page for `daomar.dev`.

### Phase 1: Full codebase rename (hard cut, no backward compatibility)

All 500+ references to `lattix`, `Lattix`, `LATTIX`, `code365.xyz`, and `chenxizhang/lattix` must be updated across 13 layers:

1. **Package identity** — `package.json` name, bin, repository, homepage; `web/package.json` name.
2. **CLI entry** — `src/cli.ts` program name from `lattix` to `agentfleet`.
3. **File system paths** — `~/.lattix/` to `~/.agentfleet/`, PID/log filenames, OneDrive subfolder `Lattix/` to `AgentFleet/`.
4. **Platform integration** — Windows Scheduled Task name, macOS LaunchAgent label (`dev.daomar.agentfleet`), VBS script name, shortcut wrapper (`agentfleet`).
5. **Version checker** — npm registry URL updated for scoped package `@daomar/agentfleet`.
6. **CLI i18n** — `src/locales/en-US.json` and `src/locales/zh-CN.json`: all "Lattix" display strings, all `lattix` command references.
7. **Web i18n** — `web/src/locales/en-US.json` and `web/src/locales/zh-CN.json`: brand name, domain, commands.
8. **Web runtime** — `LATTIX_CONFIG` to `AGENTFLEET_CONFIG`, cache prefix `lattix_` to `af_`, localStorage key `lattix-lang` to `agentfleet-lang`, CSS class `.lattix-toast` to `.af-toast`.
9. **Web static assets** — CNAME, `config.js`, `manifest.json`, `index.html` (OG/canonical/JSON-LD), `robots.txt`, `sitemap.xml`, `about.html`, `donate.html`, `llms.txt`, `.well-known/agent.json`.
10. **CI/CD** — `publish.yml` updated for `--access public` (scoped package), `FUNDING.yml` URLs.
11. **Tests** — All 21 CLI test files and all web test files: hardcoded strings, URLs, localStorage keys, domain assertions.
12. **Documentation** — `README.md`, `README.zh-CN.md`, `AGENTS.md`, `CLAUDE.md`.
13. **OpenSpec** — Active specs under `openspec/specs/`, active changes. Archived changes are left as-is (historical record).

### Phase 2: Logo and visual identity

- Design a new logo for AgentFleet that conveys the Daomar brand spirit.
- Generate all required asset sizes: SVG source, PNG (root assets), favicon.svg, PWA icons (192px, 512px), OG image (1200x630).
- Update `manifest.json` theme color if the new brand identity calls for it.

### Phase 3: Publish and verify

- Run full test suite (CLI + web) locally.
- Push to `daomar-dev/agentfleet`, verify GitHub Actions (Pages deploy + npm publish workflow).
- Verify `agentfleet.daomar.dev` loads correctly.
- Publish to npm as `@daomar/agentfleet`, verify `npx @daomar/agentfleet --help`.
- Deprecate old `lattix` npm package.
- Archive old `chenxizhang/lattix` GitHub repo with migration notice.

## What Does NOT Change

- **Product functionality** — No features are added, removed, or modified. This is a pure identity change.
- **Architecture** — No structural refactoring. The CLI/web workspace split, OneDrive sync mechanism, and all internal modules remain identical.
- **OneDrive data format** — Task and result JSON schemas are unchanged.
- **Archived OpenSpec changes** — Historical records under `openspec/changes/archive/` are preserved as-is.
- **Entra ID permissions and scopes** — The OAuth scopes (`Files.Read`, `Files.ReadWrite`, `User.Read`) remain the same; only the redirect URI changes.

## Scope

- **In scope**: GitHub org migration, npm scoped package, domain migration, full codebase rename, logo design, CI/CD updates, documentation rewrite.
- **Out of scope**: New features, backward compatibility with `~/.lattix/` or old npm package, `daomar.com` setup, Daomar brand landing page content beyond a minimal redirect/placeholder.

## Affected Capabilities / Specs

All specs under `openspec/specs/` are affected by URL and brand name changes:

- `i18n-cli` — command examples
- `i18n-web` — localStorage key name
- `web-seo-meta` — OG tags, canonical URL
- `web-seo-structured-data` — JSON-LD name and URL
- `web-seo-crawl-assets` — robots.txt and sitemap.xml URLs
- `web-geo-about-page` — about page URLs
- `web-geo-agent-manifest` — agent.json URL and name
- `web-geo-llms-txt` — llms.txt content
- `web-donation-page` — donate page URLs
- `web-account-cache` — cache key prefix
- `web-landing-page` (from growth change) — domain reference

## Testing Impact

- All existing CLI tests (21 files under `test/`) will need string updates but no logic changes.
- All existing web tests (under `web/src/`) will need URL, key, and brand string updates.
- No new test files are required — this is a rename, not a behavior change.
- Full `npm test` (CLI) and `cd web && npm test` (web) must pass before merge.
