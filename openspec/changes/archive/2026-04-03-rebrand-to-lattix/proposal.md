## Why

The project has outgrown the `agentbroker` name. The product vision is a decentralized, multi-machine agent orchestration fabric where any machine can dispatch work to every other machine, so the brand, package metadata, CLI surface, filesystem paths, and documentation should consistently reflect the new `Lattix` identity and slogan: `Distributed agent orchestration, without a control plane.`

## What Changes

- Rebrand the project from `AgentBroker` / `agentbroker` to `Lattix` / `lattix` across package metadata, repository-facing copy, CLI descriptions, user documentation, and the GitHub repository name.
- **BREAKING** Rename user-facing CLI/package entrypoints from `agentbroker` to `lattix` wherever the rename is part of the supported interface.
- **BREAKING** Rename stable local and synced directory names that currently embed the old product name so on-disk structure and generated config remain consistent with the new brand.
- Introduce a canonical Lattix brand asset set with a project icon delivered in both SVG and PNG formats.
- Update documentation to explain the decentralized orchestration model using the new slogan and branding.
- Add a real automated test suite so `npm test` validates critical Lattix behavior instead of failing with a placeholder script.

## Capabilities

### New Capabilities
- `brand-assets`: Define the canonical Lattix icon assets and where branded documentation/package surfaces should reference them.
- `automated-tests`: Define the required automated test coverage and make `npm test` execute real project tests.

### Modified Capabilities
- `cli-entrypoint`: Rename the published CLI/package interface from `agentbroker` to `lattix` and update user-facing descriptions and examples.
- `symlink-setup`: Rename the stable local home directory and synced OneDrive subdirectory from the old product name to the new Lattix brand.
- `task-watcher`: Update watcher requirements to use the renamed Lattix task directory paths.
- `result-writer`: Update result output requirements to use the renamed Lattix output directory paths.

## Impact

- Affected code: `package.json`, `README.md`, CLI definitions in `src\`, setup/path management, repository metadata, test files, and any user-visible strings.
- Affected assets: new SVG and PNG icon files plus any documentation references to them.
- Affected user workflows: install, `init`, `watch`, `submit`, `status`, and filesystem paths under the user home directory and OneDrive sync root.
- Migration risk: existing users may need clear guidance for renamed command/package/path surfaces.
