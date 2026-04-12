# Contributing to AgentFleet

Thank you for your interest in contributing to AgentFleet! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **npm** (bundled with Node.js)
- **Git**

### Clone and Install

```bash
git clone https://github.com/daomar-dev/agentfleet.git
cd agentfleet

# Install CLI dependencies
npm install

# Install web dashboard dependencies
cd web && npm install && cd ..
```

### Project Structure

AgentFleet has two workspaces:

| Workspace | Directory | Module System | Test Runner |
|-----------|-----------|---------------|-------------|
| CLI | `/` (root) | CommonJS | Node.js built-in (`node --test`) |
| Web Dashboard | `/web` | ESM (Vite) | Vitest |

> **Important:** These are separate workspaces with separate `package.json`, `node_modules`, and test runners. Do not mix imports or run commands in the wrong directory.

## Build and Test

### CLI

```bash
# Build (compiles TypeScript + copies locale files)
npm run build

# Run all tests (builds automatically first)
npm test

# Run a single test file
npm run build && node --test test/daemon.test.js
```

### Web Dashboard

```bash
cd web

# Build
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/cache.test.ts
```

## Coding Conventions

### Internationalization (i18n)

- **Never hardcode user-facing strings.** Use `t('key.name')` for all user-visible text.
- Both `en-US.json` and `zh-CN.json` must have identical key sets:
  - CLI: `src/locales/en-US.json` and `src/locales/zh-CN.json`
  - Web: `web/src/locales/en-US.json` and `web/src/locales/zh-CN.json`
- Tests enforce locale parity — mismatched keys will fail the build.

### Code Style

- Prefer small, composable modules over broad abstractions.
- Keep behavior aligned with specs documented under `openspec/specs/`.
- Prefer minimal runtime dependencies.

## Pull Request Workflow

1. **Fork** the repository and create a feature branch.
2. **Write tests first** for behavior changes (test-driven development is the project convention).
3. **Make your changes** — keep them focused and minimal.
4. **Run the full test suite:**
   ```bash
   npm test          # CLI tests
   cd web && npm test  # Web tests
   ```
5. **Submit a PR** with a clear description of what changed and why.

## Finding Issues to Work On

- Look for issues labeled [`good first issue`](https://github.com/daomar-dev/agentfleet/labels/good%20first%20issue) — these are designed for new contributors.
- Check [GitHub Discussions](https://github.com/daomar-dev/agentfleet/discussions) for feature ideas and community feedback.

## Reporting Bugs

- Open a [GitHub Issue](https://github.com/daomar-dev/agentfleet/issues/new) with:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - OS and Node.js version

## License

By contributing, you agree that your contributions will be licensed under the [ISC License](LICENSE).
