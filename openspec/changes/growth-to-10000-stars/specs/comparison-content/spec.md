## ADDED Requirements

### Requirement: Comparison section in README
Both `README.md` and `README.zh-CN.md` SHALL include a "Why AgentFleet?" section containing a comparison table that contrasts AgentFleet with at least three alternative approaches (e.g., SSH scripts, Ansible, cloud CI). The comparison SHALL cover dimensions including: infrastructure requirement, network requirement, security surface, setup complexity, and agent compatibility.

#### Scenario: Comparison table present in English README
- **WHEN** a user reads `README.md`
- **THEN** they SHALL find a section titled "Why AgentFleet?" or equivalent containing a comparison table with at least three alternatives and at least four comparison dimensions

#### Scenario: Comparison table present in Chinese README
- **WHEN** a user reads `README.zh-CN.md`
- **THEN** they SHALL find an equivalent comparison section with the same structure and alternatives, with prose translated to Simplified Chinese

### Requirement: Use case examples
The README (both languages) SHALL include at least two concrete use case examples that describe specific, relatable scenarios where AgentFleet provides value. Each example SHALL describe the scenario in one sentence and show the corresponding CLI command or dashboard action.

#### Scenario: Use cases in README
- **WHEN** a user reads the README
- **THEN** they SHALL find at least two use case examples with scenario descriptions and corresponding commands
