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

  it('renders hero section with logo and tagline', () => {
    renderLanding(container);
    const hero = container.querySelector('.landing-hero');
    expect(hero).not.toBeNull();
    expect(hero!.querySelector('.landing-logo')).not.toBeNull();
    expect(hero!.querySelector('.landing-title')).not.toBeNull();
    expect(hero!.querySelector('.landing-hook')).not.toBeNull();
  });

  it('renders sign-in button and home link', () => {
    renderLanding(container);
    const signInBtn = container.querySelector('#landing-signin-btn');
    expect(signInBtn).not.toBeNull();
    expect(signInBtn!.tagName).toBe('BUTTON');

    const homeLink = container.querySelector('#landing-home-btn') as HTMLAnchorElement;
    expect(homeLink).not.toBeNull();
    expect(homeLink.getAttribute('href')).toBe('/');
  });
});
