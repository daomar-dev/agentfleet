import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';

/** Helper: read a static-root file relative to the web root. */
function readStaticFile(relativePath: string): string {
  return readFileSync(resolve(__dirname, '..', 'static-root', relativePath), 'utf-8');
}

/** Helper: read index.html from the web root. */
function readIndexHtml(): string {
  return readFileSync(resolve(__dirname, '..', 'index.html'), 'utf-8');
}

// ---------------------------------------------------------------------------
// SEO: index.html meta tags
// ---------------------------------------------------------------------------
describe('SEO: index.html meta tags', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM(readIndexHtml());
  });

  it('contains a static <meta name="description">', () => {
    const meta = dom.window.document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toBeTruthy();
  });

  it('contains Open Graph tags', () => {
    const doc = dom.window.document;
    expect(doc.querySelector('meta[property="og:title"]')).not.toBeNull();
    expect(doc.querySelector('meta[property="og:description"]')).not.toBeNull();
    expect(doc.querySelector('meta[property="og:image"]')).not.toBeNull();
    expect(doc.querySelector('meta[property="og:url"]')).not.toBeNull();
    expect(doc.querySelector('meta[property="og:type"]')).not.toBeNull();
  });

  it('OG image uses absolute URL', () => {
    const img = dom.window.document.querySelector('meta[property="og:image"]');
    expect(img!.getAttribute('content')).toMatch(/^https:\/\//);
  });

  it('contains Twitter Card tags', () => {
    const doc = dom.window.document;
    expect(doc.querySelector('meta[name="twitter:card"]')!.getAttribute('content')).toBe('summary_large_image');
    expect(doc.querySelector('meta[name="twitter:title"]')).not.toBeNull();
    expect(doc.querySelector('meta[name="twitter:description"]')).not.toBeNull();
    expect(doc.querySelector('meta[name="twitter:image"]')).not.toBeNull();
  });

  it('contains a canonical link', () => {
    const link = dom.window.document.querySelector('link[rel="canonical"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://agentfleet.daomar.dev/web/');
  });
});

// ---------------------------------------------------------------------------
// SEO: JSON-LD SoftwareApplication
// ---------------------------------------------------------------------------
describe('SEO: JSON-LD structured data', () => {
  let jsonLd: Record<string, unknown>;

  beforeEach(() => {
    const dom = new JSDOM(readIndexHtml());
    const script = dom.window.document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    jsonLd = JSON.parse(script!.textContent!);
  });

  it('parses as valid JSON', () => {
    expect(jsonLd).toBeDefined();
  });

  it('has @context schema.org', () => {
    expect(jsonLd['@context']).toBe('https://schema.org');
  });

  it('has @type SoftwareApplication', () => {
    expect(jsonLd['@type']).toBe('SoftwareApplication');
  });

  it('has correct name and url', () => {
    expect(jsonLd['name']).toBe('AgentFleet');
    expect(jsonLd['url']).toBe('https://agentfleet.daomar.dev/web/');
  });

  it('has applicationCategory DeveloperApplication', () => {
    expect(jsonLd['applicationCategory']).toBe('DeveloperApplication');
  });

  it('has operatingSystem including Windows', () => {
    expect(jsonLd['operatingSystem']).toContain('Windows');
  });

  it('has free price offer', () => {
    const offers = jsonLd['offers'] as Record<string, unknown>;
    expect(offers['price']).toBe('0');
  });

  it('has potentialAction array', () => {
    const actions = jsonLd['potentialAction'] as Array<Record<string, unknown>>;
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
  });

  it('potentialAction entries have @type and target', () => {
    const actions = jsonLd['potentialAction'] as Array<Record<string, unknown>>;
    for (const action of actions) {
      expect(action['@type']).toBeTruthy();
      expect(action['target']).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// SEO: robots.txt
// ---------------------------------------------------------------------------
describe('SEO: robots.txt', () => {
  let content: string;

  beforeEach(() => {
    content = readStaticFile('robots.txt');
  });

  it('contains User-agent: *', () => {
    expect(content).toContain('User-agent: *');
  });

  it('contains Allow: /', () => {
    expect(content).toContain('Allow: /');
  });

  it('contains Sitemap directive', () => {
    expect(content).toContain('Sitemap: https://agentfleet.daomar.dev/sitemap.xml');
  });
});

// ---------------------------------------------------------------------------
// SEO: sitemap.xml
// ---------------------------------------------------------------------------
describe('SEO: sitemap.xml', () => {
  let content: string;

  beforeEach(() => {
    content = readStaticFile('sitemap.xml');
  });

  it('has urlset root with sitemaps.org namespace', () => {
    expect(content).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('contains landing page URL', () => {
    expect(content).toContain('<loc>https://agentfleet.daomar.dev/</loc>');
  });

  it('contains donate page URL', () => {
    expect(content).toContain('<loc>https://agentfleet.daomar.dev/donate.html</loc>');
  });

  it('contains about page URL', () => {
    expect(content).toContain('<loc>https://agentfleet.daomar.dev/about.html</loc>');
  });

  it('does not contain hash routes', () => {
    expect(content).not.toContain('#/tasks');
    expect(content).not.toContain('#/settings');
  });

  it('contains hreflang alternates for English and Simplified Chinese pages', () => {
    expect(content).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(content).toContain('hreflang="en"');
    expect(content).toContain('hreflang="zh-CN"');
    expect(content).toContain('https://agentfleet.daomar.dev/about.html?lang=zh-CN');
    expect(content).toContain('https://agentfleet.daomar.dev/donate.html?lang=en-US');
  });
});

// ---------------------------------------------------------------------------
// Static Pages: bilingual auto switching
// ---------------------------------------------------------------------------
describe('Static Pages bilingual support', () => {
  it.each(['about.html', 'donate.html'])('%s contains both locales and the auto-switch script', (page) => {
    const content = readStaticFile(page);
    expect(content).toContain('data-locale="en-US"');
    expect(content).toContain('data-locale="zh-CN"');
    expect(content).toContain('data-set-lang="en-US"');
    expect(content).toContain('data-set-lang="zh-CN"');
    expect(content).toContain('/static-i18n.js');
    expect(content).toContain('hreflang="en"');
    expect(content).toContain('hreflang="zh-CN"');
  });

  it('static-i18n.js detects browser language and supports both locales', () => {
    const content = readStaticFile('static-i18n.js');
    expect(content).toContain('navigator.language');
    expect(content).toContain('zh-CN');
    expect(content).toContain('en-US');
  });
});

// ---------------------------------------------------------------------------
// GEO: llms.txt
// ---------------------------------------------------------------------------
describe('GEO: llms.txt', () => {
  let content: string;

  beforeEach(() => {
    content = readStaticFile('llms.txt');
  });

  it('is non-empty', () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('contains no HTML tags', () => {
    expect(content).not.toMatch(/<\/?(?:html|div|p|script|head|body|span|a)\b/i);
  });

  it('contains required terms', () => {
    const lower = content.toLowerCase();
    expect(lower).toContain('agentfleet');
    expect(lower).toContain('distributed');
    expect(lower).toContain('agent');
    expect(lower).toContain('onedrive');
    expect(lower).toContain('orchestration');
  });

  it('contains GitHub repository link', () => {
    expect(content).toContain('https://github.com/daomar-dev/agentfleet');
  });

  it('contains web dashboard link', () => {
    expect(content).toContain('https://agentfleet.daomar.dev');
  });

  it('is between 200 and 500 words', () => {
    const words = content.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(500);
  });
});

// ---------------------------------------------------------------------------
// GEO: agent.json
// ---------------------------------------------------------------------------
describe('GEO: .well-known/agent.json', () => {
  let data: Record<string, unknown>;

  beforeEach(() => {
    const raw = readStaticFile('.well-known/agent.json');
    data = JSON.parse(raw);
  });

  it('parses as valid JSON', () => {
    expect(data).toBeDefined();
  });

  it('has required fields', () => {
    expect(data['schema_version']).toBeTruthy();
    expect(data['name']).toBe('AgentFleet');
    expect(typeof data['description']).toBe('string');
    expect(data['url']).toBe('https://agentfleet.daomar.dev/');
    expect(data['auth']).toBeDefined();
    expect((data['auth'] as Record<string, unknown>)['type']).toBeTruthy();
  });

  it('has non-empty capabilities array', () => {
    const caps = data['capabilities'] as Array<Record<string, unknown>>;
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it('each capability has name, description, and requires_auth', () => {
    const caps = data['capabilities'] as Array<Record<string, unknown>>;
    for (const cap of caps) {
      expect(typeof cap['name']).toBe('string');
      expect(typeof cap['description']).toBe('string');
      expect(typeof cap['requires_auth']).toBe('boolean');
    }
  });

  it('includes task submission and viewing capabilities', () => {
    const caps = data['capabilities'] as Array<Record<string, unknown>>;
    const names = caps.map((c) => c['name']);
    expect(names).toContain('submit_task');
    expect(names).toContain('view_tasks');
  });
});

// ---------------------------------------------------------------------------
// GEO: about.html Article JSON-LD
// ---------------------------------------------------------------------------
describe('GEO: about.html structured data', () => {
  let dom: JSDOM;
  let jsonLd: Record<string, unknown>;

  beforeEach(() => {
    dom = new JSDOM(readStaticFile('about.html'));
    const script = dom.window.document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    jsonLd = JSON.parse(script!.textContent!);
  });

  it('has @type Article', () => {
    expect(jsonLd['@type']).toBe('Article');
  });

  it('has required Article fields', () => {
    expect(jsonLd['headline']).toBeTruthy();
    expect(jsonLd['description']).toBeTruthy();
    expect(jsonLd['author']).toBeTruthy();
    expect(jsonLd['datePublished']).toBeTruthy();
  });

  it('about.html has section headings', () => {
    const headings = dom.window.document.querySelectorAll('h2');
    expect(headings.length).toBeGreaterThanOrEqual(4);
  });

  it('about.html contains technical terminology', () => {
    const text = dom.window.document.body.textContent!.toLowerCase();
    expect(text).toContain('distributed');
    expect(text).toContain('decentralized');
    expect(text).toContain('onedrive sync');
    expect(text).toContain('control plane');
  });

  it('about.html has authoritative external links', () => {
    const links = Array.from(dom.window.document.querySelectorAll('a[href]')).map((a) =>
      a.getAttribute('href')!,
    );
    expect(links.some((l) => l.includes('github.com/daomar-dev/agentfleet'))).toBe(true);
    expect(links.some((l) => l.includes('microsoft.com') || l.includes('learn.microsoft.com'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GEO: donate.html DonateAction JSON-LD
// ---------------------------------------------------------------------------
describe('GEO: donate.html DonateAction', () => {
  it('contains DonateAction JSON-LD with target', () => {
    const dom = new JSDOM(readStaticFile('donate.html'));
    const script = dom.window.document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent!);
    expect(data['@type']).toBe('DonateAction');
    expect(data['target']).toContain('paypal.me');
  });
});

// ---------------------------------------------------------------------------
// SEO: initI18n updates OG/Twitter tags
// ---------------------------------------------------------------------------
describe('SEO: initI18n OG/Twitter tag updates', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the i18n singleton by re-importing
    document.documentElement.lang = '';
    document.title = '';
    // Set up index.html-like meta tags in jsdom
    document.head.innerHTML = `
      <meta name="description" content="English description" />
      <meta property="og:title" content="English OG title" />
      <meta property="og:description" content="English OG desc" />
      <meta name="twitter:title" content="English Twitter title" />
      <meta name="twitter:description" content="English Twitter desc" />
    `;
  });

  it('updates OG and Twitter tags for zh-CN locale', async () => {
    localStorage.setItem('agentfleet-lang', 'zh-CN');
    // Re-import to get fresh singleton
    const { initI18n } = await import('./i18n');
    initI18n();

    expect(document.querySelector('meta[property="og:title"]')!.getAttribute('content')).toContain('AgentFleet');
    expect(document.querySelector('meta[property="og:description"]')!.getAttribute('content')).not.toBe('English OG desc');
    expect(document.querySelector('meta[name="twitter:title"]')!.getAttribute('content')).toContain('AgentFleet');
    expect(document.querySelector('meta[name="twitter:description"]')!.getAttribute('content')).not.toBe('English Twitter desc');
  });

  it('keeps English meta tags for en-US locale', async () => {
    localStorage.setItem('agentfleet-lang', 'en-US');
    const { initI18n } = await import('./i18n');
    initI18n();

    // Should update to the en-US locale values (which are English)
    const ogTitle = document.querySelector('meta[property="og:title"]')!.getAttribute('content')!;
    expect(ogTitle).toContain('AgentFleet');
  });
});
