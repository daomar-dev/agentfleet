## 1. Generate PayPal QR Code Image

- [x] 1.1 Generate a PayPal QR code PNG image encoding `https://paypal.me/chenxizhang2026` with foreground color #0070ba on white background, at 480px resolution (2x for retina), and save as `web/public/paypal-donation.png`

## 2. Update Donate Page Layout

- [x] 2.1 In `web/public/donate.html`, add an `<img>` element for the PayPal QR code in the PayPal card, positioned between the description and the button
- [x] 2.2 Add a `.paypal-qr` CSS class with the same sizing as `.wechat-qr` (width: 240px, max-width: 100%, border-radius: 8px)
- [x] 2.3 Remove `margin-top: auto` from `.paypal-btn` and `.wechat-qr` CSS rules; replace with a fixed `margin-top: 1.5rem` or use `gap` on `.channel-card` for compact consistent spacing

## 3. Verification

- [x] 3.1 Open `donate.html` locally and visually verify: both cards show QR codes at equal height, no large empty gaps, PayPal QR is blue-themed
- [x] 3.2 Verify responsive behavior at < 768px (cards stack, QR codes still visible)
- [x] 3.3 Verify Chinese locale behavior (WeChat card appears first, text is Chinese)
- [x] 3.4 Run `npm run build` in web/ to confirm no build errors
