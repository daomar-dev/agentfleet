## Context

The project is migrating from `lattix` (personal project under `chenxizhang`) to `AgentFleet` (first product under the `Daomar` brand organization). This is a hard-cut rename with no backward compatibility — the project is in early testing with no real user base to migrate.

The brand **Daomar** (刀马 · 道码) carries dual cultural meaning: the boldness of a swordsman (刀马) and the principle of masterful code (道码). AgentFleet is the first product in this portfolio.

## Naming Conventions

### Brand hierarchy

```
Daomar (org/brand)
  └── AgentFleet (product)
        ├── CLI: @daomar/agentfleet
        │     bin: agentfleet
        └── Web: agentfleet.daomar.dev
```

### Casing rules

| Context | Format | Example |
|---------|--------|---------|
| npm package | lowercase scoped | `@daomar/agentfleet` |
| CLI binary | lowercase | `agentfleet` |
| User-facing display | Title case | `AgentFleet` |
| Config directory | dotfile lowercase | `~/.agentfleet/` |
| OneDrive folder | Title case | `AgentFleet/` |
| Environment/config vars | UPPER_SNAKE | `AGENTFLEET_CONFIG` |
| CSS class prefix | short lowercase | `af-` |
| Cache key prefix | short lowercase + underscore | `af_` |
| localStorage key | kebab-case | `agentfleet-lang` |
| macOS LaunchAgent | reverse domain | `dev.daomar.agentfleet` |
| Windows Scheduled Task | Title case | `AgentFleet` |
| Service Worker cache | kebab + version | `agentfleet-v1` |

## Infrastructure Setup

### GitHub

1. Create repository `daomar-dev/agentfleet` (public, MIT license).
2. Enable GitHub Pages with GitHub Actions deployment source.
3. Set custom domain to `agentfleet.daomar.dev`.
4. Configure `release` environment for npm provenance publishing.
5. Transfer or recreate GitHub Actions secrets for npm publish (`NPM_TOKEN`).

### Cloudflare DNS (daomar.dev zone)

```
agentfleet.daomar.dev   CNAME   daomar-dev.github.io    (proxied or DNS-only)
```

For the `daomar.dev` root domain redirect to GitHub org:
- Use Cloudflare Redirect Rules (free tier): `daomar.dev/*` → `https://github.com/daomar-dev` (301 permanent).
- Alternatively, create a `daomar-dev.github.io` repo with a minimal brand landing page and point `daomar.dev` A records to GitHub Pages IPs (185.199.108-111.153).

**Decision**: Use a minimal landing page at `daomar-dev.github.io` so `daomar.dev` has a branded presence rather than a raw redirect. The page conveys the Daomar brand story (刀马 · 道码) and links to AgentFleet.

### npm

```bash
npm deprecate lattix "This package has moved to @daomar/agentfleet"
```

The new package `@daomar/agentfleet` requires `--access public` on first publish since scoped packages default to restricted.

### Entra ID (Azure AD)

Update the existing App Registration (client ID `b94f9687-adcf-48ea-9861-c4ce4b5c01a0`):
- Add SPA redirect URI: `https://agentfleet.daomar.dev/`
- Keep `http://localhost:5173/` for local development.
- Optionally remove old `https://lattix.code365.xyz/` redirect after migration is verified.

If the existing app registration is tied to personal account constraints, create a new one under a directory the org controls. This changes the `clientId` in `config.js`.

## Code Rename Strategy

### Approach: Systematic layer-by-layer replacement

Each layer is independent and can be verified in isolation. The rename is purely mechanical — no logic changes.

### Layer 1: Package identity

**`package.json` (root)**:
```json
{
  "name": "@daomar/agentfleet",
  "bin": {
    "agentfleet": "dist/cli.js"
  },
  "repository": {
    "url": "git+https://github.com/daomar-dev/agentfleet.git"
  },
  "homepage": "https://github.com/daomar-dev/agentfleet#readme"
}
```

**`web/package.json`**:
```json
{
  "name": "@daomar/agentfleet-web"
}
```

### Layer 2: CLI entry

**`src/cli.ts`**: Change `.name('lattix')` to `.name('agentfleet')`.

### Layer 3: File system paths

**`src/services/setup.ts`**:
```typescript
const AGENTFLEET_DIR = '.agentfleet';
const LEGACY_LATTIX_DIR = '.lattix';        // keep for reference, no migration logic
const ONEDRIVE_SUBDIR = 'AgentFleet';
const LEGACY_ONEDRIVE_SUBDIR = 'Lattix';    // keep for reference, no migration logic
```

Rename all internal identifiers: `lattixDir` → `agentfleetDir`, `LattixConfig` → `AgentFleetConfig`, `getLattixDir()` → `getAgentFleetDir()`.

**Note on legacy migration**: The existing code already has a `migrateLegacyPaths()` pattern that migrates from `AgentBroker` → `Lattix`. Since we are doing a hard cut (no backward compat), we remove the old `AgentBroker` migration code entirely and do NOT add `Lattix` → `AgentFleet` migration. Clean slate.

**`src/services/daemon.ts`**: `lattixDir` → `agentfleetDir`, PID file `agentfleet.pid`, log file `agentfleet.log`.

**`src/types/index.ts`**: `LattixConfig` → `AgentFleetConfig`, update `DEFAULT_CONFIG` type reference.

### Layer 4: Platform integration

**`src/services/shortcut.ts`**:
- `isGloballyInstalled()`: check for the `agentfleet` binary.
- `wrapperExists()`: check `agentfleet.cmd` / `agentfleet`.
- `createWrapper()`: create the `agentfleet` wrapper pointing to `npx -y @daomar/agentfleet`.
- Update `ShortcutResult` comments.

**`src/services/windows-service.ts`**:
- Task name: `AgentFleet`
- VBS script: `start-agentfleet.vbs`
- VBS content: `npx -y @daomar/agentfleet run -d`
- Directory: `~/.agentfleet/`

**`src/services/macos-auto-start.ts`**:
- Label: `dev.daomar.agentfleet`
- Plist argument: `@daomar/agentfleet`

### Layer 5: Version checker

**`src/services/version-checker.ts`**:
```typescript
// Scoped package registry URL format
const body = await fetchFn('https://registry.npmjs.org/@daomar%2fagentfleet/latest');
```

### Layer 6 & 7: i18n (CLI + Web)

All four locale files need systematic `Lattix` → `AgentFleet` and `lattix` → `agentfleet` replacement in user-visible strings. Command examples change from `lattix run` to `agentfleet run`.

Key i18n string changes:
```
"Lattix v{current}"           → "AgentFleet v{current}"
"`lattix` command is now..."  → "`agentfleet` command is now..."
"lattix stop"                 → "agentfleet stop"
"npx -y lattix run"           → "npx -y @daomar/agentfleet run"
```

### Layer 8: Web runtime

| File | Old | New |
|------|-----|-----|
| `web/src/auth.ts` | `LATTIX_CONFIG` | `AGENTFLEET_CONFIG` |
| `web/src/types.ts` | `LATTIX_CONFIG` interface | `AGENTFLEET_CONFIG` |
| `web/src/cache.ts` | `lattix_${accountId}_` | `af_${accountId}_` |
| `web/src/i18n.ts` | `lattix-lang` | `agentfleet-lang` |
| `web/src/index.ts` | `.lattix-toast` | `.af-toast` |
| `web/src/utils.ts` | `.lattix-toast` | `.af-toast` |
| `web/src/components/settings.ts` | GitHub/npm URLs | daomar-dev URLs |

### Layer 9: Web static assets

All URLs change from `lattix.code365.xyz` to `agentfleet.daomar.dev`. All brand names change from `Lattix` to `AgentFleet`. GitHub URLs change from `chenxizhang/lattix` to `daomar-dev/agentfleet`. npm URLs change to `@daomar/agentfleet`.

Files: `CNAME`, `config.js`, `manifest.json`, `index.html`, `robots.txt`, `sitemap.xml`, `about.html`, `donate.html`, `llms.txt`, `.well-known/agent.json`, `sw.js` (cache name).

### Layer 10: CI/CD

**`.github/workflows/publish.yml`**:
```yaml
- run: npm publish --access public --provenance
```

**`.github/FUNDING.yml`**: Update donate URL to `agentfleet.daomar.dev/donate.html`.

### Layer 11: Tests

Mechanical replacement in all test files. No test logic changes. The `i18n-catalog.test.js` will automatically verify locale parity after changes.

### Layer 12: Documentation

Full rewrite of `README.md` and `README.zh-CN.md` with new brand name, URLs, and commands.

### Layer 13: OpenSpec

Update active specs under `openspec/specs/` and the active `growth-to-1000-stars` change. Leave `openspec/changes/archive/` untouched.

Update `openspec/config.yaml` project name.

## Logo Design

### Direction

The AgentFleet logo should convey:
1. **Fleet / distributed** — multiple agents working in coordination
2. **Technical precision** — developer tool aesthetic
3. **Daomar spirit** — subtle eastern influence without being literal

### Concept: Fleet formation

A set of stylized agent nodes in formation (like ships in a fleet or birds in flight), using clean geometric shapes. The Daomar brand color palette should be distinct from the old Lattix blue-purple gradient.

### Required outputs

| Asset | Size | Location |
|-------|------|----------|
| Source SVG | 512x512 | `assets/icon.svg` |
| PNG export | 512x512 | `assets/icon.png` |
| Favicon | any (SVG) | `web/public/favicon.svg` |
| PWA icon small | 192x192 | `web/public/icons/icon-192.png` |
| PWA icon large | 512x512 | `web/public/icons/icon-512.png` |
| OG image | 1200x630 | `web/public/og-image.png` |

## Daomar.dev Brand Page

A single-page static site hosted at `daomar-dev.github.io` (mapped to `daomar.dev`):

- Daomar brand name and tagline in both English and Chinese.
- Brief brand story (刀马 · 道码).
- Product listing with AgentFleet as the first entry.
- Links to GitHub org and relevant resources.
- Minimal, clean design consistent with AgentFleet's aesthetic.

## Test Strategy

This is a rename-only change — no behavior modifications. The test strategy is:

1. **Before any code changes**: Run `npm test` and `cd web && npm test` to establish green baseline.
2. **After rename**: Run the same test suites. All tests should pass with updated string expectations.
3. **Manual verification**: 
   - `node dist/cli.js --help` shows "agentfleet" as program name.
   - `node dist/cli.js run` creates `~/.agentfleet/` directory.
   - Web dashboard loads at `http://localhost:5173/` with "AgentFleet" branding.

No new tests are needed. Existing test coverage already verifies all the strings, paths, and URLs that are being renamed.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Miss a `lattix` reference somewhere | Medium | Grep sweep after all changes; tests catch most |
| npm scoped package naming issues | Low | `npm whoami` and `npm org ls daomar` confirmed working |
| GitHub Pages custom domain propagation delay | Low | DNS is on Cloudflare (fast propagation) |
| Entra ID redirect URI mismatch | Medium | Test OAuth flow on localhost before deploying |
| Old `lattix` users confused | Very Low | Hard cut is acceptable — project is in testing phase |
