# Architecture decision records (ADRs)

Each important architecture decision lives in a numbered file: the context, the decision and the consequences.

The initial plan closed on 2026-10-18 and **ADRs 0001–0014 are fixed**: an accepted ADR is not rewritten; if the decision changes, a new ADR supersedes it. (Until that date they were edited in place.)

Statuses: **Proposed** (awaiting confirmation), **Accepted**, **Superseded by NNNN**.

| # | Decision | Status |
|---|---|---|
| [0001](0001-open-source-local-first.md) | Open source and local-first | Accepted |
| [0002](0002-node-cli-with-local-web-dashboard.md) | Globally installed Node CLI with a local web dashboard, for projects on disk with dependencies installed | Accepted |
| [0003](0003-typescript-first-language-agnostic-model.md) | TypeScript first, language-agnostic graph model | Accepted |
| [0004](0004-stack-node-oxc-typescript.md) | Stack: Node/TS, oxc and the TS type checker behind an interface | Accepted |
| [0005](0005-layered-analysis-with-provenance.md) | Layered, incremental analysis with provenance on every link | Accepted |
| [0006](0006-optional-isolated-llm.md) | LLM features are optional, isolated and off by default | Accepted |
| [0007](0007-fixture-as-ground-truth.md) | A fictional fixture with the ground truth as the acceptance test | Accepted |
| [0008](0008-never-run-project-code.md) | Never run the analysed project's code without an explicit request | Accepted |
| [0009](0009-first-target-schema-first-graphql.md) | First target: schema-first GraphQL with @graphql-tools, codegen and Federation in an Nx/pnpm monorepo | Accepted |
| [0010](0010-mit-license.md) | MIT licence | Accepted |
| [0011](0011-english-as-project-language.md) | English as the project language | Accepted |
| [0012](0012-name-codestrata.md) | Name: codestrata | Accepted |
| [0013](0013-dashboard-design.md) | Dashboard design: question-driven views, tests hidden by default | Accepted |
| [0014](0014-dashboard-technology.md) | Dashboard technology: React, HTML/SVG and D3; the graph view may come back | Accepted |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
```
