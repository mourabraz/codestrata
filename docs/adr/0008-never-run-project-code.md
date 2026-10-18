# 0008. Never run the analysed project's code without an explicit request

- Status: Accepted
- Date: 2026-10-18

## Context

Installing dependencies, running the codegen or using `nx graph` (which loads the project's plugins) runs the analysed project's code. Even on a local project that has side effects the user did not ask for: it changes `node_modules` and generated files, can take minutes and runs arbitrary scripts. On the other hand, the type layer needs dependencies installed and may need generated files ([spike](../../spikes/indexing/REPORT.md)). Since the input is a project that is already installed ([0002](0002-node-cli-with-local-web-dashboard.md)), these cases are the exception.

## Decision

- The tool only reads files. It does not install dependencies, and does not run scripts, codegen or project plugins.
- When something is missing (dependencies, generated files), it warns, shows the command the user can run and marks the affected links as partial.
- Running anything only happens with an explicit option (for example `--run-codegen`), after showing the command.
- The analysed project's configuration is JSON, not code.

## Consequences

- The analysis has no side effects on the project: it does not change `node_modules`, generated files or the repository.
- When something is missing, the message has to be clear and say how to improve precision.
- The Nx project graph is computed from the files (`project.json`, `package.json`, `nx.json`), not with `nx graph`.
