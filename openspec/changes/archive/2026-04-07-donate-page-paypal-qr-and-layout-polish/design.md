## Context

The donate page (`web/public/donate.html`) is a standalone static HTML file with inline CSS and JS. It shows two channel cards side-by-side: PayPal (left for English users) and WeChat Pay (right). The WeChat card contains a QR code image (~240px wide) while the PayPal card only has a button at the bottom. Both cards use `margin-top: auto` on their visual elements, which pushes them to the card bottom and creates a large empty gap between description text and content.

## Goals / Non-Goals

**Goals:**
- Add a QR code to the PayPal card that encodes the PayPal.me URL, using PayPal brand blue (#0070ba) as the QR module color, sized to match the WeChat QR code height.
- Remove the excessive vertical gap between card description and QR code/button in both cards.
- Maintain the existing responsive behavior and locale-based card ordering.

**Non-Goals:**
- Changing the PayPal.me URL or WeChat QR code image.
- Adding new donation channels.
- Changing the page header, footer, or navigation integration.

## Decisions

### Decision 1: QR code generation approach — static pre-generated image

**Choice**: Generate a static PayPal QR code image file (PNG) and place it in `web/public/` alongside the existing `wechat-donation.jpg`.

**Alternatives considered**:
- **Client-side JS library (e.g., qrcode.js via CDN)**: Adds an external runtime dependency and CDN availability risk for a static page. The QR content (PayPal.me URL) never changes, making runtime generation unnecessary.
- **Inline SVG hardcoded**: Fragile to maintain and hard to regenerate if the URL changes.

**Rationale**: The WeChat QR is already a static image. Using the same approach keeps the page consistent, avoids external dependencies, and works offline. A simple PNG with PayPal-blue colored modules can be generated once using any QR tool.

### Decision 2: QR code styling — PayPal blue on white, matching WeChat card height

The PayPal QR code image will use #0070ba (the PayPal button color) as its foreground module color on a white background. The `<img>` element will use the same CSS class sizing as the WeChat QR code to ensure equal heights.

### Decision 3: Layout fix — replace `margin-top: auto` with compact spacing

**Choice**: Remove `margin-top: auto` from `.paypal-btn` and `.wechat-qr` and instead use a fixed `margin-top` (e.g., `1.5rem`) on the QR images/button. The `.channel-card` will use `gap` for consistent internal spacing instead of pushing content to the bottom.

**Rationale**: `margin-top: auto` was originally used to bottom-align the button, but now that both cards will have QR codes of equal size, the cards will naturally have similar content height. A consistent `gap` provides tighter, more polished spacing.

### Decision 4: PayPal card layout — QR code above button

The PayPal card will show: title → description → QR code → button. The QR code provides a visual anchor (matching the WeChat card) while the button remains as the primary interactive element below it.

## Test Strategy

The donate page is a standalone static HTML file with no unit test coverage on its internal layout. Since this change is purely visual (CSS spacing + adding a static image), no new automated tests are needed. The existing navbar tests (verifying the donate link and heart icon) are unaffected. Manual verification: open `/donate.html` and confirm both cards have QR codes at equal height with compact spacing.

## Risks / Trade-offs

- **[Risk] QR code image quality on high-DPI screens** → Generate the PNG at 2x resolution (e.g., 480px for a 240px display size) for crisp rendering on retina displays.
- **[Risk] PayPal QR code not recognized by PayPal app** → PayPal mobile app can scan standard QR codes encoding PayPal.me URLs. Verify by testing with the PayPal app after generating the image.
- **[Trade-off] Static image requires manual regeneration if URL changes** → Acceptable since the PayPal.me URL is stable and rarely changes. Document the generation method in a code comment.
