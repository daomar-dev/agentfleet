## Context

The Lattix web dashboard is a client-rendered SPA on GitHub Pages. The SEO change (parallel) adds traditional meta tags, OG tags, and basic JSON-LD. This GEO change goes further: it makes the site **optimized for generative AI engines** (LLMs that read and cite web content) and **discoverable by autonomous AI agents** that browse the web to find and use tools.

Current state: the dashboard has zero content designed for LLM consumption. No plain-text summaries, no agent manifests, no action descriptors. The login-gated SPA content is invisible to any crawler, human or AI.

Key insight: unlike the authenticated SPA pages, we can create **static public pages** that serve as the generative-engine-facing and agent-facing surface. These pages contain the structured, authoritative content that generative engines prefer to cite, and the machine-readable descriptors that agents need to discover capabilities.

## Goals / Non-Goals

**Goals:**
- Make Lattix's purpose, architecture, and capabilities easily understandable by LLMs reading the site
- Provide a `llms.txt` file following the emerging convention for LLM-friendly site descriptions
- Create a content-rich static "about" page optimized for GEO: technical depth, statistics, authoritative references, structured sections
- Declare the dashboard's capabilities via Schema.org `potentialAction` so agents can discover what actions are possible
- Provide a `/.well-known/agent.json` manifest for agent discovery (following the emerging pattern from OpenAI plugins and Microsoft Copilot extensibility)

**Non-Goals:**
- Building a full API or MCP server — the dashboard talks to Microsoft Graph directly; there is no backend to expose
- Making the authenticated pages agent-accessible — these require MSAL auth and have no public value
- Auto-executing tasks from agent requests — the structured data describes capabilities, but actual execution requires a human-initiated Graph API flow

## Decisions

### 1. `llms.txt` at site root

**Decision:** Create a plain-text `/llms.txt` file that describes Lattix in 200-400 words of clear, factual prose. Include: what Lattix is, how it works, key features, who it's for, and links to detailed pages.

**Rationale:** `llms.txt` is an emerging convention (similar to `robots.txt` and `humans.txt`) adopted by several projects and proposed as a lightweight way to help LLMs understand a site. Unlike HTML, it's trivially parseable and has no rendering overhead. Generative engines that follow links or check known paths will find it.

**Alternative considered:** Relying solely on HTML meta tags and JSON-LD — rejected because generative engines benefit from a single, dedicated, plain-text resource they can read in full without parsing HTML.

### 2. Static `/about.html` with GEO-optimized content

**Decision:** Create a standalone HTML page at `/about.html` that is publicly accessible (no auth) and contains:
- Technical overview with domain-specific terminology (distributed systems, agent orchestration, OneDrive sync)
- Statistics and concrete claims ("fan out across N machines", "zero infrastructure", "< 10s latency through OneDrive sync")
- Authoritative references (links to OneDrive documentation, MSAL documentation, the GitHub repo)
- Structured sections with clear headings (How it Works, Architecture, Security Model, Getting Started)
- Schema.org `Article` markup in JSON-LD

**Rationale:** The GEO paper identifies five key strategies that boost generative engine visibility: (1) citing statistics, (2) adding quotations/authoritative sources, (3) using technical terminology, (4) adding structured data, (5) fluency and clarity. The about page is designed to hit all five.

**Alternative considered:** Adding GEO content only to the README (GitHub-hosted) — rejected because generative engines index web pages, and the README is on `github.com/chenxizhang/lattix`, not on the dashboard domain. Both should exist, but the dashboard needs its own content.

### 3. `/.well-known/agent.json` manifest

**Decision:** Create a `.well-known/agent.json` following a minimal manifest schema:
```json
{
  "schema_version": "1.0",
  "name": "Lattix",
  "description": "Distributed agent orchestration dashboard",
  "url": "https://lattix.code365.xyz/",
  "auth": { "type": "oauth2", "provider": "microsoft_entra_id" },
  "capabilities": [
    {
      "name": "submit_task",
      "description": "Submit a coding task to all enrolled machines",
      "requires_auth": true
    },
    {
      "name": "view_tasks",
      "description": "View all submitted tasks and their results",
      "requires_auth": true
    },
    {
      "name": "view_nodes",
      "description": "View enrolled machines and their status",
      "requires_auth": true
    }
  ],
  "contact": "https://github.com/chenxizhang/lattix"
}
```

**Rationale:** This follows the pattern established by OpenAI's `ai-plugin.json` and similar manifests. Even though no agent runtime currently consumes this format universally, placing it at the well-known path establishes forward compatibility. As agent browsing matures, this manifest will be the first thing an agent checks.

**Alternative considered:** Only Schema.org `potentialAction` — this handles search engines well but doesn't provide the richer capability description that autonomous agents need (auth requirements, action names, descriptions).

### 4. Schema.org `potentialAction` in JSON-LD

**Decision:** Extend the existing `SoftwareApplication` JSON-LD (from the SEO change) with `potentialAction` entries:
- `SearchAction` with URL template for task search
- A custom action describing task submission capability

**Rationale:** Schema.org Actions are the established standard for declaring what a web application can do. Search engines (especially Google and Bing) already parse these. Adding them costs nothing and makes the application's capabilities machine-discoverable.

### 5. `DonateAction` on `donate.html`

**Decision:** Add JSON-LD to `donate.html` with a `DonateAction` schema linking to the PayPal URL.

**Rationale:** Enables generative engines to surface donation information when users ask about supporting the project. Minimal effort for potential visibility gain.

## Test Strategy

- **`llms.txt` format test (Vitest):** Verify file exists in build output, is non-empty plain text, contains key terms ("Lattix", "distributed", "agent", "OneDrive"), and has no HTML tags
- **`agent.json` schema test (Vitest):** Parse the JSON, verify required fields (`schema_version`, `name`, `capabilities`), verify capabilities array is non-empty
- **`potentialAction` test (Vitest):** Parse the JSON-LD from `index.html`, verify `potentialAction` array exists and contains entries with `@type` and `target`
- **`about.html` structured data test:** Parse JSON-LD from the page, verify `@type` is "Article" with required fields
- **Build verification:** Confirm all new static files appear in `web/dist/` after build

## Risks / Trade-offs

- **[Risk] `llms.txt` and `agent.json` are not yet standardized** → Mitigation: The files are simple, cheap to maintain, and follow emerging conventions. If standards change, updating them is trivial. The worst case is that they go unused, not that they cause harm.
- **[Risk] `about.html` content may become stale relative to README** → Mitigation: Keep the about page focused on stable architectural facts rather than version-specific features. Add a "last updated" date and a link to the GitHub repo for the latest info.
- **[Risk] Agents may attempt to interact with the dashboard without proper auth** → Mitigation: The `agent.json` manifest explicitly declares `requires_auth: true` for all capabilities. The dashboard's MSAL flow will reject unauthenticated requests regardless.
- **[Risk] GEO effectiveness is hard to measure** → Accepted trade-off: There's no reliable way to track how often generative engines cite the page. We optimize based on the published research and rely on qualitative signals (appearing in AI search results).
