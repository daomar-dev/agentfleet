## ADDED Requirements

### Requirement: Cache keys scoped by account
All localStorage cache entries managed by `cache.ts` SHALL include the signed-in user's account identifier in the key, ensuring data isolation between accounts.

#### Scenario: Two accounts produce separate cache entries
- **WHEN** Account A stores a cache entry with key "home_tasks"
- **AND** Account B stores a cache entry with key "home_tasks"
- **THEN** the two entries SHALL have different localStorage keys
- **AND** reading "home_tasks" as Account A SHALL return only Account A's data

#### Scenario: Cache key format
- **WHEN** a cache entry is stored for account with `homeAccountId` "abc123"
- **THEN** the localStorage key SHALL follow the pattern `af_abc123_cache_{key}`

### Requirement: Settings scoped by account
All localStorage settings entries managed by `cache.ts` SHALL include the signed-in user's account identifier in the key.

#### Scenario: Settings isolated between accounts
- **WHEN** Account A sets a preference "default_agent" to "claude"
- **AND** Account B has not set "default_agent"
- **THEN** reading "default_agent" as Account B SHALL return the default value, not "claude"

#### Scenario: Settings key format
- **WHEN** a setting is stored for account with `homeAccountId` "abc123"
- **THEN** the localStorage key SHALL follow the pattern `af_abc123_pref_{key}`

### Requirement: Graceful fallback without account
When no account is signed in (pre-login state), cache and settings functions SHALL fall back to an unscoped key prefix to avoid errors.

#### Scenario: Cache access before login
- **WHEN** `getCache()` is called before any account is signed in
- **THEN** it SHALL use the fallback prefix `af__cache_{key}` (empty account segment)
- **AND** no error SHALL be thrown

### Requirement: No cross-account data leakage on login
When a user signs in, the dashboard SHALL use account-scoped cache keys so that any data cached by a previous user is not visible.

#### Scenario: New user signs in after previous user
- **WHEN** User A signs in and the dashboard caches task data
- **AND** User A logs out
- **AND** User B signs in
- **THEN** User B SHALL NOT see User A's cached tasks, nodes, or settings
