import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth module
vi.mock('../auth', () => ({
  login: vi.fn(() => Promise.resolve()),
}));

// Mock i18n module
vi.mock('../i18n', () => ({
  t: vi.fn((key: string) => key),
}));

import { renderLanding } from './landing';

describe('renderLanding', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders hero section with logo, tagline, CLI command, and quick-start hint', () => {
    renderLanding(container);
    const hero = container.querySelector('.landing-hero');
    expect(hero).not.toBeNull();
    expect(hero!.querySelector('.landing-logo')).not.toBeNull();
    expect(hero!.querySelector('.landing-title')).not.toBeNull();
    expect(hero!.querySelector('.landing-hook')).not.toBeNull();
    expect(hero!.querySelector('.landing-command code')).not.toBeNull();
    expect(hero!.querySelector('.landing-command-hint')).not.toBeNull();
  });

  it('renders at least three value proposition blocks with headings and descriptions', () => {
    renderLanding(container);
    const cards = container.querySelectorAll('.landing-value-card');
    expect(cards.length).toBeGreaterThanOrEqual(3);
    cards.forEach((card) => {
      expect(card.querySelector('h3')).not.toBeNull();
      expect(card.querySelector('p')).not.toBeNull();
    });
  });

  it('renders architecture overview section', () => {
    renderLanding(container);
    const arch = container.querySelector('.landing-architecture');
    expect(arch).not.toBeNull();
    expect(arch!.querySelector('h2')).not.toBeNull();
    expect(arch!.querySelector('.landing-arch-diagram')).not.toBeNull();
  });

  it('renders concrete usage examples', () => {
    renderLanding(container);
    const examples = container.querySelector('.landing-examples');
    expect(examples).not.toBeNull();
    expect(examples!.querySelectorAll('.landing-example-card').length).toBe(3);
  });

  it('renders CTA links with GitHub, fork, donate, architecture, and sign-in actions', () => {
    renderLanding(container);
    const githubLink = container.querySelector('#landing-github-btn') as HTMLAnchorElement;
    expect(githubLink).not.toBeNull();
    expect(githubLink.getAttribute('target')).toBe('_blank');
    expect(githubLink.getAttribute('href')).toContain('github.com/daomar-dev/agentfleet');

    const forkLink = container.querySelector('#landing-fork-btn') as HTMLAnchorElement;
    expect(forkLink).not.toBeNull();
    expect(forkLink.getAttribute('href')).toContain('github.com/daomar-dev/agentfleet/fork');

    const donateLink = container.querySelector('#landing-donate-btn') as HTMLAnchorElement;
    expect(donateLink).not.toBeNull();
    expect(donateLink.getAttribute('href')).toBe('/donate.html');

    const signInBtn = container.querySelector('#landing-signin-btn');
    expect(signInBtn).not.toBeNull();
    expect(signInBtn!.tagName).toBe('BUTTON');
  });
});
