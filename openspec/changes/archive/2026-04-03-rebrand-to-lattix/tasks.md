## 1. Rebrand package and CLI surfaces

- [x] 1.1 Rename package metadata, bin entry, GitHub repository name, and repository-facing product strings from `agentbroker` / `AgentBroker` to `lattix` / `Lattix`.
- [x] 1.2 Update CLI definitions, command help text, and usage examples so supported commands are invoked as `lattix`.
- [x] 1.3 Audit source files for remaining user-visible legacy brand strings and replace them with the canonical Lattix name and slogan where appropriate.

## 2. Rename stable storage paths with migration support

- [x] 2.1 Update setup and path constants to use `~/.lattix` and `<OneDrivePath>\Lattix` as the canonical local and synced directories.
- [x] 2.2 Implement safe legacy-path migration or reuse logic for existing `~/.agentbroker` and `AgentBroker` directories, including conflict detection.
- [x] 2.3 Update task watching, result writing, config handling, and processed-record logic to read and write the renamed Lattix paths consistently.

## 3. Refresh documentation and branding assets

- [x] 3.1 Rewrite README and other primary documentation surfaces to present the project as `Lattix` with the slogan `Distributed agent orchestration, without a control plane.`
- [x] 3.2 Add a canonical Lattix icon as both SVG and PNG, using a decentralized lattice/mesh visual concept suitable for the project.
- [x] 3.3 Reference the new icon and branding consistently from repository/package surfaces that expose project identity.

## 4. Validate and document the migration

- [x] 4.1 Verify the renamed CLI and path behavior still support the `init`, `watch`, `submit`, and `status` workflows.
- [x] 4.2 Run the existing build and any available validation commands after the rebrand changes.
- [x] 4.3 Document any required manual migration steps, release notes, and repository-rename follow-up steps for users upgrading from the old `agentbroker` naming.

## 5. Add automated tests

- [x] 5.1 Replace the placeholder `npm test` script with a real automated test command using the existing Node.js toolchain.
- [x] 5.2 Add automated tests that cover critical Lattix behaviors, including setup/migration and result-writing paths.
- [x] 5.3 Run the automated test suite and confirm it passes after the rebrand changes.
