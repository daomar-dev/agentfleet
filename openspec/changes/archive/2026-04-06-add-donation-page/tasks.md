## 1. Donation Page

- [x] 1.1 Create `web/public/donate.html` — standalone static page with inline CSS, PayPal section (English) on the left, WeChat Pay section (Chinese with QR code image) on the right, responsive layout collapsing to stacked on mobile (<768px)
- [x] 1.2 Git-track `web/public/wechat-donation.jpg`

## 2. Dashboard Navigation

- [x] 2.1 Add "Donate" link to desktop navbar in `web/src/components/navbar.ts` — append to `.navbar-desktop-links`, pointing to `/donate.html` with `target="_blank"`, no change to mobile tab bar
- [x] 2.2 Add "Support Lattix" link to Settings About section in `web/src/components/settings.ts` — inline with existing GitHub and npm links, pointing to `/donate.html` with `target="_blank"`

## 3. Tests

- [x] 3.1 Update `web/src/components/navbar.test.ts` to verify desktop navbar contains 4 links (Home, Tasks, Settings, Donate) and mobile tab bar still contains exactly 3 tabs
- [x] 3.2 Run `npm test` in `web/` and verify all tests pass

## 4. Repository Metadata

- [x] 4.1 Update `.github/FUNDING.yml` to add the donation page URL to the custom array
- [x] 4.2 Add a "Support" section to `README.md` with a link to the donation page and mention of both channels

## 5. Build Verification

- [x] 5.1 Run `npm run build` in `web/` and verify no errors
