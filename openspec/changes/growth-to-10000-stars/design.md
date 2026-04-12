## Context

AgentFleet is a functionally complete CLI + web dashboard for distributed AI agent orchestration via OneDrive sync, now operating under the Daomar brand (`@daomar/agentfleet` v2.0.2, deployed at `agentfleet.daomar.dev`). The brand upgrade from `lattix`/`chenxizhang` to `AgentFleet`/`daomar-dev` is complete — new GitHub org, npm scope, domain, and logo are all live.

The project has zero public awareness on its new repository: 0 GitHub stars, 0 forks, 0 GitHub Releases, no Topics configured, no Discussions enabled. The web app shows a Microsoft login wall to all visitors — there is no public-facing content explaining what AgentFleet is. The README is documentation-oriented. There are no demo assets and no launch content prepared.

The goal is to reach **10,000+ GitHub stars within three months** through a three-wave growth campaign: product polish → coordinated multi-platform launch → sustained content engine.

## Goals / Non-Goals

**Goals:**

- Make the first 30 seconds of any visitor's experience compelling — whether they arrive at the website, the GitHub repo, or a social media link.
- Build a public landing page that converts visitors without requiring sign-in.
- Restructure the README as a marketing-first document with immediate visual impact.
- Create demo assets (GIF + video) that show the multi-machine flow.
- Equip the repo with standard open-source credibility signals (badges, releases, contributing guide, discussions).
- Prepare launch content for 10+ platforms (English + Chinese).
- Establish a sustained content engine that keeps driving organic stars for 8+ weeks after launch.
- Optimize for GitHub Trending discovery during peak star-velocity windows.
- Submit to curated Awesome lists and discovery platforms for long-tail discoverability.

**Non-Goals:**

- Adding new CLI or agent features.
- Building paid/enterprise features.
- Investor materials or pitch decks.
- Native Linux OneDrive support (document workarounds only).
- Discord server or real-time chat community (GitHub Discussions is sufficient).
- Domain acquisition (agentfleet.com etc.).

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
8. Use cases (2+ concrete scenarios)
9. Star History chart (social proof)
10. Links to full documentation, dashboard, contributing
```

**Rationale:** GitHub README is the #1 conversion surface for developer tools. The current README leads with prerequisites and installation — information that matters only after someone decides they want the tool. The hook, demo, and value props must come first. The Star History chart (new for 10K target) provides social proof and creates a self-reinforcing growth loop — people are more likely to star a project that is already trending.

### D3: Demo GIF recorded with real multi-machine flow

**Choice:** Record a real demo showing: (1) `agentfleet run` on two machines, (2) `agentfleet submit` from a third, (3) all machines executing simultaneously, (4) results appearing in the dashboard. Compress to a 30-second GIF for README and a 3-minute video for YouTube/Bilibili.

**Rationale:** Authenticity matters more than polish. A real terminal recording (via asciinema or similar) showing actual OneDrive sync and multi-machine execution is more convincing than animations or mockups.

**Alternatives considered:**
- Animated SVG/mockup: Easier to produce but less convincing and feels artificial.
- Screenshot-only: Insufficient — the multi-machine coordination story needs motion to convey the "wow" moment.

### D4: OG image with architecture diagram

**Choice:** Replace the current generic OG image with a version that includes a simplified architecture visualization — showing multiple machines connected through OneDrive with task arrows flowing between them. Keep the AgentFleet branding but add visual substance.

**Rationale:** The OG image appears in every social media share. The current version provides zero information about what the product does. An architecture-infused image tells a story in one glance and is more likely to stop someone scrolling.

### D5: GitHub Releases + CHANGELOG via automated workflow

**Choice:** Add a CHANGELOG.md maintained manually. Create GitHub Releases for all published versions (v1.0.9 through v2.0.2). Add a GitHub Actions workflow that automatically creates a Release when a version tag is pushed.

**Rationale:** GitHub Releases populate the repo sidebar, send notifications to watchers, and provide download counts. They are a standard credibility signal. The project has 8 published npm versions but 0 GitHub Releases — this is a missed opportunity.

### D6: GitHub Discussions as sole community channel

**Choice:** Enable GitHub Discussions as the primary and only community channel. No Discord.

**Rationale:** GitHub Discussions have zero friction for developers who are already on the repo page. Discord requires a separate account and context switch. For a project at 0-10K stars, consolidating community in one place (GitHub) is more effective than splitting across platforms. Discord can be added post-10K when the community demands real-time chat.

### D7: Three-wave growth strategy over 12 weeks

**Choice:** Execute growth in three distinct waves, each with different tactics and star velocity targets:

**Wave 1: Ignition (Weeks 1-3) — Target: 200-500 stars**
- Ship all product readiness items: landing page, marketing-first README with demo GIF and badges, new OG image, GitHub infrastructure (Releases, Topics, Discussions, CONTRIBUTING, CHANGELOG).
- Quietly share with personal network and early adopters.
- Collect feedback, fix issues, iterate on landing page copy.
- Goal: the repo looks credible and "alive" before public launch.

**Wave 2: Combustion (Weeks 3-5) — Target: 500-3,000 stars**
- 7-day staggered launch across platforms (not simultaneous — each platform gets its own day for maximum individual impact):
  - Day 1: Show HN (weekday morning US Eastern)
  - Day 2: Reddit (r/programming, r/devtools, r/artificial)
  - Day 3: Twitter/X launch thread with demo GIF
  - Day 4: Product Hunt launch
  - Day 5: Chinese platforms (V2EX, Juejin, Zhihu simultaneously)
  - Day 6: Dev.to / Hashnode long-form article
  - Day 7: Bilibili video + WeChat article
- Have 5-10 supporters ready to engage in comments on each platform.
- Monitor and respond to all comments within 2 hours during launch week.

**Wave 3: Sustained burn (Weeks 5-12) — Target: 3,000-10,000 stars**
- Weekly content cadence: 1 technical article or integration tutorial per week.
- Submit to Awesome lists and discovery platforms.
- Cross-platform amplification: each viral moment feeds content on other platforms.
- Milestone celebrations (1K, 5K stars) as secondary viral triggers.
- User stories and testimonials for social proof.

**Rationale:** 10,000 stars cannot be achieved by a single-day launch. Even the most successful Show HN posts peak at 2,000-3,000 stars. The remaining growth must come from sustained content, discovery via Awesome lists, and organic word-of-mouth. The 7-day staggered launch (vs simultaneous) gives each platform its own news cycle and avoids splitting the founder's attention across 10+ channels on one day.

**Alternatives considered:**
- Simultaneous launch on all platforms (original 1K plan): Works for 1K but plateaus quickly. Each platform competes for the same 24 hours of attention.
- Month-long drip launch: Too slow to build momentum. Staggered but concentrated (7 days) is the sweet spot.

### D8: Content engine — weekly technical articles

**Choice:** Produce one technical article or integration tutorial per week for 8 weeks (Weeks 5-12). Alternate between English-first (Dev.to/Hashnode, then translated to Juejin/Zhihu) and Chinese-first (Juejin/Zhihu, then translated to Dev.to) to keep both audiences fed.

Content types in priority order:
1. **Integration guides** (highest conversion): "How to use AgentFleet with Claude Code / Copilot / Cursor / Codex"
2. **Architecture deep-dives**: "OneDrive as a Message Queue", "Zero-Infrastructure Distributed Systems"
3. **Use-case stories**: "How I run coding agents across 3 machines with zero setup"
4. **Comparisons**: "AgentFleet vs Ansible for AI agent orchestration"

**Rationale:** Integration guides rank highest because they capture search traffic from people already using the target agent (e.g., "Claude Code multi-machine"). Architecture posts build credibility. Use-case stories provide social proof. Each article includes a link back to the GitHub repo, creating a steady inflow of new visitors.

### D9: GitHub Trending optimization

**Choice:** Concentrate star velocity during specific windows to maximize chances of appearing on GitHub Trending (daily/weekly). Tactics:
- Seed 50-200 stars in Week 1-3 (avoid zero-star appearance during launch).
- Launch HN/Reddit on the same weekday to stack velocity.
- When star velocity spikes naturally, amplify with cross-posts to other platforms within 24 hours.
- Use the Trending appearance itself as content ("AgentFleet is trending on GitHub!").

**Rationale:** GitHub Trending is the single highest-leverage discovery channel for open source. A single day on Trending can bring 500-2,000 stars. The algorithm favors acceleration (rate of new stars) over absolute count, so timing matters more than total stars.

### D10: Cross-platform amplification flywheel

**Choice:** Treat each platform success as fuel for the next platform. Specifically:
- HN front page → tweet "AgentFleet hit #1 on HN" → Reddit post referencing HN discussion
- Reddit success → screenshot for Twitter thread → Dev.to "lessons learned" article
- Each milestone (1K, 5K stars) → dedicated celebration post on all platforms
- User testimonials → embedded in README, landing page, and social posts

**Rationale:** Viral growth is compounding. Each visible success makes the next platform's audience more likely to engage. The key is rapid cross-posting (within 24 hours) while momentum is hot.

### D11: Awesome list and discovery platform submissions

**Choice:** Submit AgentFleet to curated lists and directories after Wave 2 launch (when the repo has enough stars to look credible):
- `awesome-selfhosted` (fits: self-hosted, no cloud dependency)
- `awesome-ai-agents` / `awesome-ai-tools` (fits: AI agent orchestration)
- `awesome-developer-tools` (fits: developer productivity)
- AlternativeTo (listed as alternative to Ansible, cloud CI)
- GitHub topic discovery pages (via Topics already configured in D5)

**Rationale:** Awesome lists are long-tail discovery engines. Once accepted, they provide a permanent backlink and a steady stream of organic visitors. The submission itself is low effort but the review process can take weeks — submit early in Wave 3.

## Risks / Trade-offs

**[Risk] Landing page in SPA with hash routing hurts SEO** → The landing page itself renders at `/` without a hash. Static `about.html` already exists and is crawlable. For the launch phase, social shares and direct links matter more than organic search. Migrate to history-mode routing post-launch if SEO becomes critical.

**[Risk] Demo recording requires multiple physical machines** → Can use one machine with multiple terminal panes + a VM or remote machine. The visual effect of hostnames appearing in results is what matters. Alternatively, record a shortened version focusing on the web dashboard view of results arriving from multiple machines.

**[Risk] Show HN post gets ignored or downvoted** → Mitigate by timing the post (weekday morning US time), having the landing page polished before posting, and having 5-10 people ready to engage in comments. The "zero infrastructure" angle and OneDrive-as-coordination-layer novelty are genuinely interesting — the risk is more about presentation than substance.

**[Risk] Product Hunt launch falls flat** → PH success is partly luck, partly preparation. Create a compelling visual and have supporters ready to upvote on launch day. Even a modest PH launch generates backlinks and a permanent page.

**[Risk] Content in Chinese and English doubles the work** → The project already has full i18n. README already exists in both languages. Each content piece for Chinese platforms is adapted (not translated) with platform-appropriate tone and angles. Budget roughly 40% extra time for Chinese content.

**[Risk] Growth plateau after initial launch spike** → The most common failure mode is a strong launch followed by star count flatlining. The content engine (D8) and Awesome list submissions (D11) exist specifically to prevent this. If growth stalls below 5K, consider: (1) a second "Show HN" with a major feature, (2) outreach to tech influencers, (3) conference lightning talks.

**[Risk] Content production bottleneck** → One article per week for 8 weeks is ambitious for a solo maintainer. Mitigate by: (1) drafting outlines for all 8 articles in advance, (2) repurposing content across platforms (an article becomes a tweet thread becomes a short video), (3) accepting "good enough" quality over perfection — consistency matters more than polish.

**[Risk] GitHub Trending is not guaranteed** → Trending placement depends on relative star velocity across all GitHub repos, which is unpredictable. Plan for success but don't depend on it. The sustained content engine should drive 3,000-5,000 stars even without a Trending appearance. Trending is a bonus multiplier, not a requirement.

**[Risk] 10,000 stars in 3 months is aggressive** → Very few projects reach 10K in 3 months without either (a) a famous creator, (b) venture backing, or (c) viral luck. The plan is designed to maximize the probability but should be evaluated as a stretch goal. A realistic "good outcome" is 3,000-5,000 stars. A "great outcome" is 10K+. The plan's structure (product readiness → launch → sustained content) delivers value at any star count.

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
2. **Launch week timing:** What calendar week is optimal for launch? Avoid major holidays, conferences, and competing launches.
3. **GitHub Actions for releases:** Should releases be fully automated (tag push → release) or semi-automated (manual trigger with version input)?
4. **Landing page content language:** Should the landing page auto-detect language (like the dashboard does) or default to English with a language toggle? The about.html is currently English-only.
5. **Content pipeline tooling:** Should article drafts live in the repo (e.g., `docs/articles/`) or externally (Notion, Google Docs)? In-repo keeps everything version-controlled but adds noise to the commit history.
