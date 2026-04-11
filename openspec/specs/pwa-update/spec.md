# pwa-update

Service Worker versioning, cache invalidation on new deployments, and automatic update notification for the web dashboard.

## Requirements

### Requirement: Build-stamped cache name
The Service Worker SHALL use a cache name that includes a build-specific identifier (e.g., timestamp or hash), so that each deployment produces a distinct cache name.

#### Scenario: New deployment produces new cache name
- **WHEN** the web dashboard is built twice at different times
- **THEN** the resulting `sw.js` files SHALL contain different cache name strings

#### Scenario: Cache name format
- **WHEN** the Service Worker initializes
- **THEN** the cache name SHALL follow the pattern `agentfleet-<build-identifier>` where `<build-identifier>` is unique per build

### Requirement: Old cache cleanup on activation
The Service Worker SHALL delete all caches except the current build's cache during the `activate` event.

#### Scenario: Activation purges stale caches
- **WHEN** a new Service Worker activates
- **THEN** all caches whose names do not match the current cache name SHALL be deleted

### Requirement: Network-first for navigation requests
The Service Worker SHALL use a network-first strategy for navigation requests (HTML documents) to ensure the browser always receives the latest `index.html`.

#### Scenario: Online navigation request
- **WHEN** the browser makes a navigation request and the network is available
- **THEN** the Service Worker SHALL return the network response
- **THEN** the response SHALL be cached for offline fallback

#### Scenario: Offline navigation request
- **WHEN** the browser makes a navigation request and the network is unavailable
- **THEN** the Service Worker SHALL return the cached response if available

### Requirement: Cache-first for static assets
The Service Worker SHALL use a cache-first strategy for non-navigation requests (JS, CSS, images) since Vite produces content-hashed filenames.

#### Scenario: Cached asset hit
- **WHEN** the browser requests a static asset that exists in the cache
- **THEN** the Service Worker SHALL return the cached response without a network request

#### Scenario: Cache miss for new asset
- **WHEN** the browser requests a static asset not in the cache
- **THEN** the Service Worker SHALL fetch from the network, cache the response, and return it

### Requirement: Update notification
The web application SHALL detect when a new Service Worker version is available and notify the user with a non-disruptive prompt.

#### Scenario: New version detected
- **WHEN** the browser detects an updated Service Worker (via `updatefound` event)
- **AND** the new worker reaches the `activated` state
- **THEN** the application SHALL display a toast notification indicating an update is available

#### Scenario: User-initiated refresh
- **WHEN** the user interacts with the update notification
- **THEN** the page SHALL reload to activate the new version

#### Scenario: No interruption during use
- **WHEN** an update is detected while the user is actively using the application
- **THEN** the application SHALL NOT automatically reload the page
- **THEN** the update notification SHALL remain visible until the user acts on it or dismisses it

### Requirement: Skip-waiting activation
The new Service Worker SHALL call `skipWaiting()` during install so it activates immediately without waiting for all tabs to close.

#### Scenario: Immediate activation
- **WHEN** a new Service Worker finishes installing
- **THEN** it SHALL activate immediately, replacing the previous Service Worker
