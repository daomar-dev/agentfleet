## ADDED Requirements

### Requirement: PayPal QR code display
The PayPal channel card SHALL display a QR code image encoding the PayPal.me URL (`https://paypal.me/chenxizhang2026`). The QR code modules SHALL use PayPal brand blue (#0070ba) as foreground color on a white background. The QR code image SHALL be the same display height as the WeChat QR code image.

#### Scenario: PayPal QR code rendering
- **WHEN** the donation page loads
- **THEN** the PayPal card SHALL display a QR code image above the "Donate with PayPal" button
- **THEN** the QR code SHALL encode the URL `https://paypal.me/chenxizhang2026`
- **THEN** the QR code foreground color SHALL be #0070ba (PayPal blue)

#### Scenario: PayPal QR code size matches WeChat QR code
- **WHEN** the donation page renders on any viewport
- **THEN** the PayPal QR code image display height SHALL match the WeChat QR code image display height

## MODIFIED Requirements

### Requirement: PayPal donation channel
The donation page SHALL display a PayPal donation section in English, containing a QR code encoding the PayPal.me URL and a clickable link button to the PayPal.me URL (`https://paypal.me/chenxizhang2026`).

#### Scenario: PayPal button interaction
- **WHEN** a user clicks the PayPal donation link
- **THEN** the browser SHALL open the PayPal.me page (in a new tab)

#### Scenario: PayPal card content order
- **WHEN** the donation page renders the PayPal card
- **THEN** the card SHALL display in order: title, description, QR code image, donate button

### Requirement: Responsive layout
The donation page SHALL display the two donation channels side by side on desktop and stacked vertically on mobile. The locale-based channel ordering SHALL be preserved in both layouts. Both channel cards SHALL use compact vertical spacing between description text and visual content (QR codes and buttons) without excessive gaps.

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 768px or wider
- **THEN** the PayPal and WeChat sections SHALL appear side by side, with the locale-preferred channel on the left

#### Scenario: Mobile viewport
- **WHEN** the viewport width is narrower than 768px
- **THEN** the PayPal and WeChat sections SHALL stack vertically, with the locale-preferred channel on top

#### Scenario: Compact card spacing
- **WHEN** the donation page renders on any viewport
- **THEN** both channel cards SHALL NOT have large empty gaps between the description text and the QR code / button area
