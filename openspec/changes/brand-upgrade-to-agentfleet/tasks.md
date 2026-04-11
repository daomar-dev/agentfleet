## Phase 0: Infrastructure Setup

### 0.1 GitHub Organization & Repository
- [x] 0.1.1 Create public repo `daomar-dev/agentfleet` with MIT license via `gh repo create daomar-dev/agentfleet --public --license mit`
- [x] 0.1.2 Enable GitHub Pages on `daomar-dev/agentfleet` with GitHub Actions deployment source
- [x] 0.1.3 Set custom domain to `agentfleet.daomar.dev` via `gh api repos/daomar-dev/agentfleet/pages -X PUT -f cname=agentfleet.daomar.dev`
- [x] 0.1.4 Create `release` environment on the new repo for npm provenance publishing
- [x] 0.1.5 Create `daomar-dev/daomar-dev.github.io` repo for the brand landing page

### 0.2 Cloudflare DNS
- [ ] 0.2.1 Login to Cloudflare CLI: `wrangler login`
- [x] 0.2.2 Add CNAME record: `agentfleet.daomar.dev` → `daomar-dev.github.io`
- [x] 0.2.3 Configure `daomar.dev` root domain: either A records to GitHub Pages IPs (185.199.108-111.153) or redirect rule to GitHub org
- [x] 0.2.4 Verify DNS propagation for `agentfleet.daomar.dev`

### 0.3 Daomar Brand Landing Page
- [x] 0.3.1 Create minimal `index.html` for `daomar-dev.github.io` with brand story (刀马 · 道码), AgentFleet product link, and GitHub org link
- [x] 0.3.2 Add CNAME file with `daomar.dev`
- [x] 0.3.3 Push to `daomar-dev/daomar-dev.github.io` and verify `daomar.dev` loads

### 0.4 Entra ID (Azure AD)
- [x] 0.4.1 Add SPA redirect URI `https://agentfleet.daomar.dev/` to existing App Registration (client ID `b94f9687-adcf-48ea-9861-c4ce4b5c01a0`)
- [x] 0.4.2 Verify OAuth flow works with new redirect URI (can defer to Phase 3 verification)

### 0.5 npm Preparation
- [x] 0.5.1 Verify npm org access: `npm org ls daomar`
- [x] 0.5.2 Verify scoped publish will work: `npm access ls-packages @daomar`

## Phase 1: Codebase Rename

### 1.1 Package Identity
- [x] 1.1.1 Update `package.json`: `name` → `@daomar/agentfleet`, `bin` → `{ "agentfleet": "dist/cli.js" }`, `repository.url` → `git+https://github.com/daomar-dev/agentfleet.git`, `homepage` → `https://github.com/daomar-dev/agentfleet#readme`
- [x] 1.1.2 Update `web/package.json`: `name` → `@daomar/agentfleet-web`

### 1.2 CLI Entry
- [x] 1.2.1 Update `src/cli.ts`: `.name('lattix')` → `.name('agentfleet')`

### 1.3 Types
- [x] 1.3.1 Rename `LattixConfig` → `AgentFleetConfig` in `src/types/index.ts`
- [x] 1.3.2 Update `DEFAULT_CONFIG` type reference in `src/types/index.ts`
- [x] 1.3.3 Update all imports of `LattixConfig` across `src/` files

### 1.4 File System Paths
- [x] 1.4.1 Update `src/services/setup.ts`: `LATTIX_DIR` → `AGENTFLEET_DIR` (`.agentfleet`), `ONEDRIVE_SUBDIR` → `AgentFleet`, remove legacy `AgentBroker` migration code, rename `lattixDir` → `agentfleetDir`, `getLattixDir()` → `getAgentFleetDir()`, rename `loadConfig` return type
- [x] 1.4.2 Update `src/services/daemon.ts`: `lattixDir` → `agentfleetDir`, PID file → `agentfleet.pid`, log file → `agentfleet.log`

### 1.5 Platform Integration
- [x] 1.5.1 Update `src/services/shortcut.ts`: binary name checks → `agentfleet`, wrapper creation for the main binary, npx command → `npx -y @daomar/agentfleet`
- [x] 1.5.2 Update `src/services/windows-service.ts`: task name → `AgentFleet`, VBS → `start-agentfleet.vbs`, npx command → `npx -y @daomar/agentfleet run -d`, directory → `~/.agentfleet/`
- [x] 1.5.3 Update `src/services/macos-auto-start.ts`: label → `dev.daomar.agentfleet`, npx command → `@daomar/agentfleet`

### 1.6 Version Checker
- [x] 1.6.1 Update `src/services/version-checker.ts`: registry URL → `https://registry.npmjs.org/@daomar%2fagentfleet/latest`

### 1.7 CLI i18n
- [x] 1.7.1 Update `src/locales/en-US.json`: all `Lattix` → `AgentFleet`, all `lattix` command refs → `agentfleet`, `npx -y lattix` → `npx -y @daomar/agentfleet`
- [x] 1.7.2 Update `src/locales/zh-CN.json`: same changes as en-US

### 1.8 Web i18n
- [x] 1.8.1 Update `web/src/locales/en-US.json`: brand name, domain, command references
- [x] 1.8.2 Update `web/src/locales/zh-CN.json`: same changes as en-US

### 1.9 Web Runtime Code
- [x] 1.9.1 Update `web/src/auth.ts`: `LATTIX_CONFIG` → `AGENTFLEET_CONFIG`
- [x] 1.9.2 Update `web/src/types.ts`: `LATTIX_CONFIG` → `AGENTFLEET_CONFIG` in Window interface
- [x] 1.9.3 Update `web/src/cache.ts`: cache prefix `lattix_` → `af_`
- [x] 1.9.4 Update `web/src/i18n.ts`: `lattix-lang` → `agentfleet-lang`
- [x] 1.9.5 Update `web/src/index.ts`: `.lattix-toast` → `.af-toast`
- [x] 1.9.6 Update `web/src/utils.ts`: `.lattix-toast` → `.af-toast`
- [x] 1.9.7 Update `web/src/components/settings.ts`: GitHub URL → `daomar-dev/agentfleet`, npm URL → `@daomar/agentfleet`
- [x] 1.9.8 Update any CSS files with `.lattix-` class names → `.af-`

### 1.10 Web Static Assets
- [x] 1.10.1 Update `web/public/CNAME`: `agentfleet.daomar.dev`
- [x] 1.10.2 Update `web/public/config.js`: `LATTIX_CONFIG` → `AGENTFLEET_CONFIG`
- [x] 1.10.3 Update `web/public/manifest.json`: name → `AgentFleet`, short_name → `AgentFleet`
- [x] 1.10.4 Update `web/index.html`: all OG tags, canonical URL, JSON-LD — domain → `agentfleet.daomar.dev`
- [x] 1.10.5 Update `web/public/robots.txt`: sitemap URL
- [x] 1.10.6 Update `web/public/sitemap.xml`: all `<loc>` URLs
- [x] 1.10.7 Update `web/public/about.html`: all URLs, brand names, GitHub links
- [x] 1.10.8 Update `web/public/donate.html`: all URLs, brand names, GitHub links
- [x] 1.10.9 Update `web/public/llms.txt`: all URLs, brand names, descriptions
- [x] 1.10.10 Update `web/public/.well-known/agent.json`: name, URL, contact, descriptions
- [x] 1.10.11 Update `web/public/sw.js` if it contains cache name `lattix-v1` → `agentfleet-v1`

### 1.11 CI/CD
- [x] 1.11.1 Update `.github/workflows/publish.yml`: ensure `npm publish --access public --provenance`
- [x] 1.11.2 Update `.github/FUNDING.yml`: donate URL → `agentfleet.daomar.dev/donate.html`

### 1.12 CLI Tests
- [x] 1.12.1 Update `test/setup-service.test.js`: `.lattix` → `.agentfleet`, `Lattix` → `AgentFleet`, `LattixConfig` → `AgentFleetConfig`
- [x] 1.12.2 Update `test/daemon.test.js`: PID/log filenames, directory paths
- [x] 1.12.3 Update `test/shortcut.test.js`: binary names, wrapper names, npx commands
- [x] 1.12.4 Update `test/windows-service.test.js`: task name, VBS name, paths
- [x] 1.12.5 Update `test/macos-auto-start.test.js`: label, plist content
- [x] 1.12.6 Update `test/cli-branding.test.js`: program name assertion
- [x] 1.12.7 Update `test/version-check.test.js`: registry URL
- [x] 1.12.8 Update `test/run-command.test.js`: command references
- [x] 1.12.9 Update `test/install-command.test.js`: command references
- [x] 1.12.10 Update `test/stop-command.test.js`: brand name references
- [x] 1.12.11 Update `test/status-command.test.js`: brand name references
- [x] 1.12.12 Update `test/uninstall-command.test.js`: brand name references
- [x] 1.12.13 Update `test/i18n.test.js`: any brand references
- [x] 1.12.14 Update `test/i18n-catalog.test.js`: any brand references
- [x] 1.12.15 Update remaining test files (`bootstrap.test.js`, `auto-start-manager.test.js`, `logger.test.js`, `onedrive-detector.test.js`, `provider-selection.test.js`, `result-writer.test.js`, `task-watcher.test.js`): scan for any `lattix`/`Lattix` references

### 1.13 Web Tests
- [x] 1.13.1 Update `web/src/cache.test.ts`: `lattix_` → `af_` in all localStorage key assertions
- [x] 1.13.2 Update `web/src/i18n.test.ts`: `lattix-lang` → `agentfleet-lang`
- [x] 1.13.3 Update `web/src/auth.test.ts`: `LATTIX_CONFIG` → `AGENTFLEET_CONFIG`
- [x] 1.13.4 Update `web/src/seo-geo.test.ts`: all `lattix.code365.xyz` → `agentfleet.daomar.dev`, all `chenxizhang/lattix` → `daomar-dev/agentfleet`, `lattix-lang` → `agentfleet-lang`, brand name assertions
- [x] 1.13.5 Update `web/src/task-cache.test.ts`: `lattix_` → `af_` cache key prefix
- [x] 1.13.6 Scan remaining web test files for any `lattix` references

### 1.14 Documentation
- [x] 1.14.1 Rewrite `README.md`: brand name, all URLs, all command examples, GitHub/npm links, web dashboard URL, donate links
- [x] 1.14.2 Rewrite `README.zh-CN.md`: same changes as README.md
- [x] 1.14.3 Update `AGENTS.md`: any `lattix` command references
- [x] 1.14.4 Update `CLAUDE.md`: if it references project-specific commands

### 1.15 OpenSpec
- [x] 1.15.1 Update `openspec/config.yaml`: project name → `AgentFleet`
- [x] 1.15.2 Update all active specs under `openspec/specs/`: URLs → `agentfleet.daomar.dev`, brand → `AgentFleet`, commands → `agentfleet`, GitHub URLs → `daomar-dev/agentfleet`
- [x] 1.15.3 Update `openspec/changes/growth-to-1000-stars/` proposal, design, tasks: URLs and brand references
- [x] 1.15.4 Leave `openspec/changes/archive/` untouched (historical record)

## Phase 1 Verification
- [x] 1.V.1 Run `npm run build` — must succeed
- [x] 1.V.2 Run `npm test` — all 21 CLI test files must pass
- [x] 1.V.3 Run `cd web && npm test` — all web test files must pass
- [x] 1.V.4 Run `grep -ri "lattix" src/ web/src/ test/ --include="*.ts" --include="*.js" --include="*.json" --include="*.html"` — must return zero results (excluding archive)
- [x] 1.V.5 Manual: `node dist/cli.js --help` shows `agentfleet` as program name

## Phase 2: Logo and Visual Identity
- [x] 2.1 Design new AgentFleet logo SVG (512x512) conveying fleet/distributed theme with Daomar brand spirit
- [x] 2.2 Export `assets/icon.png` (512x512)
- [x] 2.3 Replace `web/public/favicon.svg`
- [x] 2.4 Generate `web/public/icons/icon-192.png`
- [x] 2.5 Generate `web/public/icons/icon-512.png`
- [x] 2.6 Generate `web/public/og-image.png` (1200x630) with brand name and tagline
- [x] 2.7 Update `web/public/manifest.json` theme color if brand palette changes

## Phase 3: Publish and Verify

### 3.1 Push to New Repository
- [x] 3.1.1 Set git remote to `daomar-dev/agentfleet`: `git remote set-url origin https://github.com/daomar-dev/agentfleet.git`
- [x] 3.1.2 Push all branches and tags: `git push -u origin main --tags`
- [x] 3.1.3 Verify GitHub Actions `deploy-pages` workflow runs and succeeds
- [x] 3.1.4 Verify `https://agentfleet.daomar.dev/` loads correctly

### 3.2 npm Publish
- [x] 3.2.1 Tag release: `git tag v2.0.0` (major version bump for brand change)
- [x] 3.2.2 Push tag: `git push origin v2.0.0`
- [x] 3.2.3 Verify GitHub Actions `publish.yml` workflow publishes `@daomar/agentfleet` to npm
- [x] 3.2.4 Verify: `npx @daomar/agentfleet --help` works
- [x] 3.2.5 Verify: `npx @daomar/agentfleet run` creates `~/.agentfleet/` and works end-to-end

### 3.3 OAuth Verification
- [x] 3.3.1 Open `https://agentfleet.daomar.dev/` in browser, test Microsoft login flow
- [x] 3.3.2 Verify dashboard loads with correct branding after login

### 3.4 Old Package Cleanup
- [x] 3.4.1 Deprecate old npm package: `npm deprecate lattix "This package has moved to @daomar/agentfleet. Install with: npm install -g @daomar/agentfleet"`
- [x] 3.4.2 Archive old GitHub repo: update `chenxizhang/lattix` README with migration notice, then archive via `gh repo archive chenxizhang/lattix --confirm`

### 3.5 Brand Page Verification
- [x] 3.5.1 Verify `https://daomar.dev/` loads the brand landing page
- [x] 3.5.2 Verify AgentFleet link on brand page points to `agentfleet.daomar.dev`

### 3.6 Final Documentation Sweep
- [x] 3.6.1 Final `grep -ri "lattix\|code365\.xyz\|chenxizhang/lattix" .` to catch any remaining references (excluding `openspec/changes/archive/` and `.git/`)
- [ ] 3.6.2 Clean up any investigation report files generated during planning (if present in repo root)
