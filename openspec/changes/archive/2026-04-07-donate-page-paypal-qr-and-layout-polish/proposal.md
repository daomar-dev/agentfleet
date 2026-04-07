## Why

The PayPal section on the donate page has a large empty white space where the WeChat side has a QR code image, creating a visually unbalanced layout. Additionally, both cards have excessive vertical gap between the description text and the QR code / button area. This makes the page look unfinished and reduces visual credibility.

## What Changes

- **Add a PayPal QR code** to the PayPal channel card, generated as an inline SVG or canvas-rendered QR code encoding the PayPal.me URL. The QR code SHALL use the PayPal brand blue color (#0070ba, matching the existing "Donate with PayPal" button) and be the same height as the WeChat QR code image.
- **Remove excessive vertical spacing** between the channel card description and the QR code / button area. Currently `margin-top: auto` pushes content to the bottom, leaving a large gap. The layout should keep cards compact with minimal space between description and visual content.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-donation-page`: Adding a PayPal QR code display requirement and adjusting the card layout spacing requirement.

## Impact

- **Code**: `web/public/donate.html` — inline CSS changes for spacing, new inline JavaScript to generate a PayPal QR code SVG/canvas element.
- **Dependencies**: A lightweight client-side QR code generation library will be needed (loaded via CDN), or the QR code can be a pre-generated static image similar to the WeChat QR code approach.
- **Testing**: Visual/layout change — no automated test changes expected since the donate page is a standalone static HTML file without unit test coverage on its internal layout.
