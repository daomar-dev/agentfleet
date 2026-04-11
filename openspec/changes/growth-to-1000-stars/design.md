## Context

AgentFleet is a functionally complete CLI + web dashboard for distributed AI agent orchestration via OneDrive sync. It has near-zero public awareness (1 GitHub star, 0 forks). The web app at `agentfleet.daomar.dev` currently shows a Microsoft login wall to all visitors — there is no public-facing content explaining what AgentFleet is or why it matters. The README is documentation-oriented, not marketing-oriented. There are no demo assets, no community channels, and no launch content prepared.

The goal is to reach 1,000+ GitHub stars within two months through a coordinated launch across developer platforms (international and Chinese).

## Goals / Non-Goals

**Goals:**

- Make the first 30 seconds of any visitor's experience compelling — whether they arrive at the website, the GitHub repo, or a social media link.
- Build a public landing page that converts visitors without requiring sign-in.
- Restructure the README as a marketing-first document with immediate visual impact.
- Create demo assets (GIF + video) that show the multi-machine flow.
- Equip the repo with standard open-source credibility signals (badges, releases, contributing guide, discussions).
- Prepare launch content templates for 10+ platforms.

**Non-Goals:**

- Renaming the project or changing the domain.
- Adding new CLI or agent features.
- Building paid/enterprise features.
- Investor materials or pitch decks.
- Native Linux OneDrive support (document workarounds only).

## Decisions

### D1: Landing page as part of the existing web SPA, not a separate site

**Choice:** Add a landing page component inside `web/src/components/landing.ts` that renders for unauthenticated visitors at the root path. Authenticated users bypass it and see the dashboard.

**Rationale:** The web app is already deployed at `agentfleet.daomar.dev` with proper OG tags, CSP, and PWA config. Building a separate static site would mean two deployments, two CI pipelines, and split SEO equity. The current router in `web/src/router.ts` already has a `!isAuthenticated()` branch that renders `loginRenderer` — the landing page replaces this branch.

**Alternatives considered:**
- Separate static landing site on a different subdomain: Higher maintenance, split SEO, more infrastructure.
- GitHub Pages for landing, keep SPA for dashboard: Feasible but adds complexity and another deployment. Could revisit if the SPA approach limits SEO (hash routing).

**Trade-off:** Hash-based routing (`/#/`) is suboptimal for SEO crawlers. However, the landing page renders at `/` (no hash needed) and the SPA already has proper `<meta>` tags, structured data, and a `sitemap.xml`. For launch purposes this is adequate. Migrating to history-mode routing is a future optimization.

### D2: README restructure — hero section with embedded GIF

**Choice:** Restructure both README.md and README.zh-CN.md to follow a marketing-first order:

```
1. Logo + one-line hook
2. Badges row (npm version, license, build, downloads)
3. Embedded demo GIF (30-second flow)
4. 3 value propositions (zero servers, zero config, enterprise security)
5. Quick Start (3 lines of code)
6. Architecture diagram (ASCII or embedded image)
7. "Why AgentFleet?" comparison table
8. Links to full documentation, dashboard, contributing
```

**Rationale:** GitHub README is the #1 conversion surface for developer tools. The current README leads with prerequisites and installation — information that matters only after someone decides they want the tool. The hook, demo, and value props must come first.

### D3: Demo GIF recorded with real multi-machine flow

**Choice:** Record a real demo showing: (1) `agentfleet run` on two machines, (2) `agentfleet submit` from a third, (3) all machines executing simultaneously, (4) results appearing in the dashboard. Compress to a 30-second GIF for README and a 3-minute video for YouTube/Bilibili.

**Rationale:** Authenticity matters more than polish. A real terminal recording (via asciinema or similar) showing actual OneDrive sync and multi-machine execution is more convincing than animations or mockups.

**Alternatives considered:**
- Animated SVG/mockup: Easier to produce but less convincing and feels artificial.
- Screenshot-only: Insufficient — the multi-machine coordination story needs motion to convey the "wow" moment.

### D4: OG image with architecture diagram

**Choice:** Replace the current generic blue gradient OG image with a version that includes a simplified architecture visualization — showing multiple machines connected through OneDrive with task arrows flowing between them. Keep the AgentFleet branding but add visual substance.

**Rationale:** The OG image appears in every social media share. The current version looks like a generic placeholder and provides zero information about what the product does. An architecture-infused image tells a story in one glance and is more likely to stop someone scrolling.

### D5: GitHub Releases + CHANGELOG via conventional workflow

**Choice:** Add a CHANGELOG.md maintained manually (or via a simple script reading git tags). Create GitHub Releases for each npm version. Add a GitHub Actions workflow that creates a Release when a version tag is pushed.

**Rationale:** GitHub Releases populate the repo sidebar, send notifications to watchers, and provide download counts. They are a standard credibility signal. The project already has 7 npm versions but 0 GitHub Releases — this is a missed opportunity.

### D6: Enable GitHub Discussions over Discord for initial community

**Choice:** Enable GitHub Discussions as the primary community channel. Optionally create a Discord as a secondary channel linked from Discussions.

**Rationale:** GitHub Discussions have zero friction for developers who are already on the repo page. Discord requires a separate account and context switch. For a project at 0-1000 stars, consolidating community in one place (GitHub) is more effective than splitting across platforms. Discord can be added later when the community needs real-time chat.

### D7: Phased launch — seed, launch day, sustain

**Choice:** Execute the launch in three phases:

- **Week 1-2 (Seed):** Ship all product readiness items (landing page, README, demo, OG image, badges, releases, contributing guide, discussions). Quietly share with personal network for initial stars and bug reports.
- **Week 3 (Launch Day):** Coordinated simultaneous posts on HN (Show HN), Reddit, Product Hunt, Twitter/X, Dev.to, plus Chinese platforms (V2EX, Juejin, Zhihu, Bilibili, WeChat). Each platform gets a tailored narrative angle.
- **Week 4-8 (Sustain):** Follow-up content: comparison posts, use-case stories, response to community feedback, contributor onboarding, cross-posting viral moments.

**Rationale:** A single-day launch concentrates signal and creates the perception of momentum. Seeding with ~20-50 stars from personal network before launch day ensures the repo doesn't look completely empty when traffic arrives. Sustained content keeps the project visible after the initial spike.

## Risks / Trade-offs

**[Risk] Landing page in SPA with hash routing hurts SEO** → The landing page itself renders at `/` without a hash. Static `about.html` already exists and is crawlable. For the launch phase, social shares and direct links matter more than organic search. Migrate to history-mode routing post-launch if SEO becomes critical.

**[Risk] Demo recording requires multiple physical machines** → Can use one machine with multiple terminal panes + a VM or remote machine. The visual effect of hostnames appearing in results is what matters. Alternatively, record a shortened version focusing on the web dashboard view of results arriving from multiple machines.

**[Risk] Show HN post gets ignored or downvoted** → Mitigate by timing the post (weekday morning US time), having the landing page polished before posting, and having 3-5 people ready to engage in comments. The "zero infrastructure" angle and OneDrive-as-coordination-layer novelty are genuinely interesting — the risk is more about presentation than substance.

**[Risk] Product Hunt launch falls flat** → PH success is partly luck, partly preparation. Create a compelling visual and have supporters ready to upvote on launch day. Even a modest PH launch generates backlinks and a permanent page.

**[Risk] AgentFleet name conflict with agentfleet.com** → Not addressing in this change (explicit non-goal). Acknowledge it in FAQ if asked. The project targets a different audience (developers vs enterprise architects) and the GitHub/npm namespace is clear.

**[Risk] Content in Chinese and English doubles the work** → The project already has full i18n. README already exists in both languages. Each content piece for Chinese platforms is adapted (not translated) with platform-appropriate tone and angles. Budget roughly 40% extra time for Chinese content.

## Test Strategy

This change is primarily content and UI work. Testable code changes are limited to the web landing page and router modifications.

**Tests to add before implementation:**
- `web/src/components/landing.test.ts`: Landing page renders expected sections (hero, value props, architecture, CTA) for unauthenticated visitors.
- `web/src/router.test.ts`: Extend existing router tests to verify that unauthenticated visitors see the landing page (not just the login card), and authenticated users still see the dashboard.
- `web/src/components/navbar.test.ts`: If navbar changes for landing page (e.g., no auth-required links), test the unauthenticated navbar variant.

**Verification steps:**
- `npm run build` (CLI) succeeds.
- `npm test` (CLI) passes.
- `cd web && npm run build` succeeds.
- `cd web && npm test` passes.
- Manual check: Open `agentfleet.daomar.dev` in incognito → landing page appears. Sign in → dashboard appears.
- Manual check: Share URL on Twitter/Slack → OG image preview shows new design.
- Manual check: GitHub repo shows badges, topics, social preview, and releases in sidebar.

## Open Questions

1. **Demo recording logistics:** Which machines are available for the multi-machine demo? Can we use hostname aliasing to show distinct names (e.g., "MACBOOK-PRO", "DESKTOP-HOME", "SURFACE-GO") even if using VMs?
2. **Product Hunt timing:** Should PH launch coincide with HN, or be staggered by a few days to extend the visibility window?
3. **GitHub Actions for releases:** Should releases be fully automated (tag push → release) or semi-automated (manual trigger with version input)?
4. **Landing page content language:** Should the landing page auto-detect language (like the dashboard does) or default to English with a language toggle? The about.html is currently English-only.
