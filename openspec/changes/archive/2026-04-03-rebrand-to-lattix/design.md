## Context

The current project is implemented and documented as `AgentBroker` / `agentbroker`, including the npm package name, CLI binary, user-visible copy, GitHub repository name, local home directory (`~/.agentbroker`), and synced OneDrive subdirectory (`AgentBroker`). The requested change is a full product rebrand to `Lattix` with the official slogan `Distributed agent orchestration, without a control plane.` plus a canonical project icon in both SVG and PNG formats.

This is a cross-cutting change because the old brand appears in package metadata, CLI help and examples, setup paths, OpenSpec requirements, and repository-facing documentation. The rename also changes supported user entrypoints and stable storage paths, so the design must treat migration and consistency as first-class concerns rather than a copy-only doc refresh.

## Goals / Non-Goals

**Goals:**
- Establish `Lattix` / `lattix` as the single canonical product, package, CLI, and GitHub repository identity.
- Align stable filesystem paths and synced OneDrive subdirectories with the new brand.
- Standardize repository-facing copy around the official slogan and the project's decentralized orchestration model.
- Add a canonical Lattix icon asset set in SVG and PNG formats that can be reused in documentation and package surfaces.
- Ensure the repository has automated tests for critical behaviors and that `npm test` executes them successfully.
- Minimize user disruption by defining a migration path for existing `agentbroker` installations.

**Non-Goals:**
- Changing the task execution model, task schema, or multi-machine orchestration semantics.
- Expanding OneDrive support scope beyond the current implementation.
- Introducing a web UI, installer, or packaging system beyond the current npm-based workflow.
- Reworking unrelated command behavior that is not required for the rename and branding refresh.

## Decisions

### 1. Canonical brand surfaces become `Lattix` / `lattix`

The product title, npm package name, CLI binary name, GitHub repository name, README headline, and package description will all use the `Lattix` identity. The official slogan will be the primary one-line description in documentation and package metadata, with supporting copy explaining the decentralized "any node can dispatch" model.

Alternatives considered:
- Keep `agentbroker` as the package/binary while only changing the marketing name. Rejected because it leaves the public interface inconsistent and weakens the rebrand.
- Use `Lattix` only in docs but preserve old path names. Rejected because users would still see the old brand in daily workflows.

### 2. Stable local and synced paths are renamed, with legacy migration support

The stable local directory will move from `~/.agentbroker` to `~/.lattix`, and the synced OneDrive subdirectory will move from `AgentBroker` to `Lattix`. Implementation should support a safe migration path: reuse or migrate legacy directories when no conflicting new-brand paths exist, and surface an explicit error when both legacy and new paths exist with incompatible contents.

Alternatives considered:
- Hard break to the new paths with no migration. Rejected because existing users would appear to lose tasks, outputs, and config.
- Permanently support both legacy and new paths. Rejected because it increases complexity and undermines branding consistency.

### 3. Branding assets are stored as checked-in source files

The repository will add a canonical vector icon (`.svg`) and a checked-in raster export (`.png`) in a stable assets location. The SVG will be the editable source of truth, and the PNG will provide immediate compatibility for package/repository surfaces that need raster images.

Alternatives considered:
- Generate PNG only at release time. Rejected because the user explicitly requested both formats in the repository.
- Use text-only branding with no icon. Rejected because the change requires a strong project icon.

### 4. Documentation emphasizes decentralized orchestration rather than brokering

Updated copy should explain that Lattix provides distributed agent orchestration without a control plane, where any enrolled machine can dispatch work and every machine can execute it. This keeps the rename grounded in the product's actual architecture instead of treating it as a cosmetic brand swap.

Alternatives considered:
- Preserve the older "broker" framing and only substitute names. Rejected because it conflicts with the decentralized positioning.

### 5. Use the built-in Node.js test runner

The repository will use Node's built-in `node:test` runner instead of introducing Jest, Vitest, or another external test framework. The project already requires Node 18+, so this keeps the test stack minimal while still giving us meaningful automated coverage. Tests will run against built output in `dist/`, and source modules that need filesystem isolation will accept minimal constructor injection to make them testable with temporary directories.

Alternatives considered:
- Add Jest or Vitest. Rejected because the current project is small and does not need extra tooling or config overhead just to establish a baseline test suite.
- Keep the placeholder `npm test` script and rely only on manual validation. Rejected because the user explicitly wants automated test coverage as a project requirement.

## Risks / Trade-offs

- **[Path migration conflicts]** → Detect both legacy and new directories before mutating anything; abort with a clear migration message when automatic migration is unsafe.
- **[Release breakage from package rename]** → Update documentation, CLI help, and package metadata together so installation and invocation instructions stay aligned.
- **[Incomplete string replacement]** → Audit package metadata, README, source strings, and stable path constants as part of the implementation tasks.
- **[Icon inconsistency across formats]** → Treat the SVG as the canonical source and generate the PNG from the same visual composition.
- **[Fragile tests tied to the real workstation]** → Keep tests isolated with temporary directories and built-in Node tooling so they do not depend on a real OneDrive or user profile.

## Migration Plan

1. Rename public package, CLI, and GitHub repository references to `lattix`.
2. Introduce the canonical icon asset files and update docs/package surfaces to reference the new brand.
3. Update setup/path logic to prefer `~/.lattix` and `<OneDrivePath>\Lattix`.
4. On initialization, detect legacy `agentbroker` directories and migrate or reuse them when it is safe to do so.
5. Add automated tests and wire `npm test` to execute them.
6. Document the rename and any manual migration steps required when automatic migration cannot proceed.

## Open Questions

- Whether npm package availability for `lattix` is acceptable for immediate publication should be confirmed before release.
