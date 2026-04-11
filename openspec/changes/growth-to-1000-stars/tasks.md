## 1. Web Landing Page — Tests

- [ ] 1.1 Add `web/src/components/landing.test.ts` with tests: landing page renders hero section (logo, tagline, CLI command, demo media element) for unauthenticated visitors
- [ ] 1.2 Add landing page test: renders at least three value proposition blocks with headings and descriptions
- [ ] 1.3 Add landing page test: renders architecture overview section
- [ ] 1.4 Add landing page test: renders CTA links (GitHub repo link with `target="_blank"`, sign-in button)
- [ ] 1.5 Extend `web/src/router.test.ts`: unauthenticated visitor at `/` sees landing page component, not login card
- [ ] 1.6 Extend `web/src/router.test.ts`: authenticated visitor at `/` sees dashboard home, not landing page

## 2. Web Landing Page — Implementation

- [ ] 2.1 Add landing page i18n keys to `web/src/locales/en-US.json` and `web/src/locales/zh-CN.json` (hero, value props, architecture, CTAs)
- [ ] 2.2 Create `web/src/components/landing.ts` with hero section: logo, tagline, `npx -y @daomar/agentfleet run` command, demo media placeholder
- [ ] 2.3 Add value propositions section to landing page (zero servers, zero config, enterprise security) with i18n
- [ ] 2.4 Add architecture overview section to landing page with visual diagram (ASCII or inline SVG)
- [ ] 2.5 Add CTA section: GitHub link (`target="_blank"`), sign-in button, link to about page
- [ ] 2.6 Update `web/src/router.ts` to render landing page for unauthenticated visitors instead of login card
- [ ] 2.7 Add responsive CSS for landing page in `web/public/styles/main.css` (mobile-first, >= 320px)
- [ ] 2.8 Update `web/src/components/login.ts` or remove if fully replaced by landing page sign-in flow

## 3. OG Image Redesign

- [ ] 3.1 Design new OG image (1200x630 PNG) featuring architecture visualization: multiple machine icons connected through OneDrive with task flow arrows, plus AgentFleet branding
- [ ] 3.2 Replace `web/public/og-image.png` with new design
- [ ] 3.3 Upload the same image as GitHub Social Preview (Settings > Social preview) — manual step

## 4. Demo Media

- [ ] 4.1 Record 30-second terminal demo: `agentfleet run` on two machines, `agentfleet submit` from a third, results appearing (use asciinema or screen capture)
- [ ] 4.2 Convert recording to GIF (optimized, < 5MB) for README embedding
- [ ] 4.3 Record 3-minute full demo video: setup, submit, multi-machine execution, dashboard view of results
- [ ] 4.4 Upload demo video to YouTube and Bilibili
- [ ] 4.5 Add demo GIF to `assets/` directory (e.g., `assets/demo.gif`)

## 5. README Rewrite

- [ ] 5.1 Rewrite `README.md` with marketing-first structure: (1) logo + one-line hook, (2) badges row, (3) embedded demo GIF, (4) three value propositions, (5) quick start (3 lines), (6) architecture diagram, (7) "Why AgentFleet?" comparison table, (8) use cases, (9) links to docs/dashboard/contributing
- [ ] 5.2 Move detailed documentation sections (full usage reference, task file format, daemon mode, auto-start) below the marketing sections or link to a separate docs page
- [ ] 5.3 Add "Why AgentFleet?" comparison table: AgentFleet vs SSH scripts vs Ansible vs cloud CI across dimensions (infrastructure, network, security, setup time, agent support)
- [ ] 5.4 Add at least two concrete use case examples with scenario descriptions and CLI commands
- [ ] 5.5 Add badges row: npm version (`[![npm version](https://img.shields.io/npm/v/agentfleet)](https://www.npmjs.com/package/@daomar/agentfleet)`), license, build status (GitHub Actions), npm downloads
- [ ] 5.6 Rewrite `README.zh-CN.md` with the same marketing-first structure, translating all prose while preserving code blocks, badges, and demo media
- [ ] 5.7 Verify both READMEs have structural parity (same sections, same order, same badges, same media)

## 6. GitHub Repository Metadata

- [ ] 6.1 Create `CHANGELOG.md` at repository root with entries for all published versions (1.0.9 through 1.2.2)
- [ ] 6.2 Create `CONTRIBUTING.md` with: dev setup instructions, build/test commands, PR workflow, coding conventions, first-issue guidance
- [ ] 6.3 Create GitHub Releases for each published version (at minimum the latest v1.2.2) with release notes — manual via `gh release create` or GitHub UI
- [ ] 6.4 Add GitHub Topics to repository: `agent`, `orchestration`, `distributed`, `onedrive`, `devtools`, `ai`, `coding-agent`, `typescript` — manual via GitHub Settings
- [ ] 6.5 Enable GitHub Discussions on the repository — manual via GitHub Settings
- [ ] 6.6 Add GitHub Actions workflow for automated release creation on version tag push (`.github/workflows/release.yml`)

## 7. About Page Cross-Linking

- [ ] 7.1 Update `web/public/about.html` to include a link back to the root landing page
- [ ] 7.2 Verify landing page links to about page for detailed documentation

## 8. Launch Content Preparation

- [ ] 8.1 Write Show HN post draft: title + body text (focus on "zero-infrastructure" angle and OneDrive-as-coordination novelty)
- [ ] 8.2 Write Reddit post drafts for r/programming and r/devtools
- [ ] 8.3 Write Product Hunt listing draft: tagline, description, first comment, media assets
- [ ] 8.4 Write Twitter/X launch thread (5-7 tweets with demo GIF)
- [ ] 8.5 Write Dev.to / Hashnode article: "I built a distributed AI agent orchestrator with zero infrastructure"
- [ ] 8.6 Write V2EX launch post (Chinese, adapted for V2EX tone)
- [ ] 8.7 Write Juejin article (Chinese technical article)
- [ ] 8.8 Write Zhihu post / answer (Chinese, problem-framing angle)
- [ ] 8.9 Write Bilibili video description and script outline (Chinese)
- [ ] 8.10 Write WeChat article draft (Chinese, story-driven)

## 9. Seed Phase

- [ ] 9.1 Share with personal network and collect initial 20-50 stars
- [ ] 9.2 Collect feedback from early users and fix any landing page / README issues
- [ ] 9.3 Record at least one user testimonial or usage story for social proof

## 10. Launch Day Execution

- [ ] 10.1 Post Show HN (weekday morning US Eastern time)
- [ ] 10.2 Post Reddit threads
- [ ] 10.3 Launch on Product Hunt
- [ ] 10.4 Post Twitter/X thread with demo GIF
- [ ] 10.5 Publish Dev.to / Hashnode article
- [ ] 10.6 Post on V2EX, Juejin, Zhihu simultaneously
- [ ] 10.7 Upload Bilibili video
- [ ] 10.8 Publish WeChat article
- [ ] 10.9 Monitor all channels and respond to comments/questions within 2 hours

## 11. Verification

- [ ] 11.1 Run `cd web && npm run build` — verify web build succeeds with landing page
- [ ] 11.2 Run `cd web && npm test` — verify all web tests pass including new landing page and router tests
- [ ] 11.3 Run `npm run build` — verify CLI build succeeds (no CLI changes expected, sanity check)
- [ ] 11.4 Run `npm test` — verify CLI tests pass (no CLI changes expected, sanity check)
- [ ] 11.5 Manual verification: open `agentfleet.daomar.dev` in incognito browser — landing page renders with all sections
- [ ] 11.6 Manual verification: sign in — dashboard renders normally
- [ ] 11.7 Manual verification: share URL on Twitter/Slack — new OG image appears in preview card
- [ ] 11.8 Manual verification: GitHub repo page shows badges, topics, releases, discussions tab, social preview
