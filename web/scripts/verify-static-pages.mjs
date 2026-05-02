import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const staticRoot = resolve(root, 'static-root');
const pages = ['about.html', 'donate.html', 'index.html'];

for (const page of pages) {
  const html = readFileSync(resolve(staticRoot, page), 'utf8');
  assert(html.includes('data-locale="en-US"'), `${page} is missing English content blocks`);
  assert(html.includes('data-locale="zh-CN"'), `${page} is missing Simplified Chinese content blocks`);
  assert(html.includes('data-set-lang="en-US"'), `${page} is missing English language switch`);
  assert(html.includes('data-set-lang="zh-CN"'), `${page} is missing Chinese language switch`);
  assert(html.includes('/static-i18n.js'), `${page} is missing browser-language auto switch script`);
  assert(html.includes('hreflang="en"'), `${page} is missing English hreflang`);
  assert(html.includes('hreflang="zh-CN"'), `${page} is missing Chinese hreflang`);
}

const script = readFileSync(resolve(staticRoot, 'static-i18n.js'), 'utf8');
assert(script.includes('navigator.language'), 'static-i18n.js must inspect browser language');
assert(script.includes('zh-CN'), 'static-i18n.js must support zh-CN');
assert(script.includes('en-US'), 'static-i18n.js must support en-US');

const sitemap = readFileSync(resolve(staticRoot, 'sitemap.xml'), 'utf8');
assert(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'sitemap must include xhtml namespace for hreflang alternates');
for (const page of ['', 'about.html', 'donate.html']) {
  const path = page ? `/${page}` : '/';
  assert(sitemap.includes(`https://agentfleet.daomar.dev${path}`), `sitemap missing ${path}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
