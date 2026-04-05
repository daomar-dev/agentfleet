import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const INDEX_HTML_PATH = resolve(__dirname, '../index.html');

function getIndexHtml(): string {
  return readFileSync(INDEX_HTML_PATH, 'utf-8');
}

describe('index.html security', () => {
  it('contains CSP meta tag', () => {
    const html = getIndexHtml();
    expect(html).toContain('Content-Security-Policy');
  });

  it('CSP restricts default-src to self', () => {
    const html = getIndexHtml();
    expect(html).toContain("default-src 'self'");
  });

  it('CSP allows connect-src for Microsoft Graph and login endpoints', () => {
    const html = getIndexHtml();
    expect(html).toContain('https://graph.microsoft.com');
    expect(html).toContain('https://login.microsoftonline.com');
  });

  it('does not contain inline script tags beyond config and module entry', () => {
    const html = getIndexHtml();
    // Find all <script> tags (case-insensitive)
    const scriptTags = html.match(/<script[^>]*>/gi) || [];
    const inlineScripts = scriptTags.filter(
      (tag) =>
        !tag.includes('src=') &&
        !tag.includes('type="module"') &&
        !tag.includes("type='module'"),
    );
    // Only config.js src and module entry point should be there — no inline script blocks
    expect(inlineScripts).toHaveLength(0);
  });

  it('has viewport meta tag for mobile', () => {
    const html = getIndexHtml();
    expect(html).toContain('name="viewport"');
  });

  it('links to manifest.json for PWA', () => {
    const html = getIndexHtml();
    expect(html).toContain('manifest.json');
  });

  it('has Apple-specific PWA meta tags', () => {
    const html = getIndexHtml();
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('apple-mobile-web-app-status-bar-style');
    expect(html).toContain('apple-touch-icon');
  });
});
