# 0002. Globally installed Node CLI with a local web dashboard, for projects on disk

- Status: Accepted
- Date: 2026-10-18

## Context

The map has to be interactive (drill-down, ego view, filters), which calls for a graphical interface. At the same time, the target audience lives in the terminal and the tool has to run locally. Format alternatives: an editor extension, a desktop app, or a CLI that generates static HTML.

Accepting a git URL as input (clone and analyse) was also considered. The spike ([`spikes/indexing/REPORT.md`](../../spikes/indexing/REPORT.md)) showed that the type layer is only precise with dependencies installed: 95–100% of calls resolved with `node_modules`, ~40–60% without. Analysing a remote repo would mean installing dependencies (which runs the project's scripts) or accepting an imprecise analysis. And whoever wants to understand a project is usually working on it: it is already cloned and installed.

## Decision

- A globally installed npm package. The command analyses the project and serves a web dashboard on `localhost`, specific to that project, whose URL is shown in the terminal (and opened in the browser).
- **The input is a path to a project on disk, with its dependencies installed.** The tool does not clone repositories.
- If dependencies are missing or incomplete, the analysis does not block: it shows the structural map, warns with the install command and marks the affected type-based links as partial.

## Consequences

- It works with any editor and any operating system that runs Node.
- The tool needs no network ([0001](0001-open-source-local-first.md)) and no cache of remote repositories.
- The precision of the type layer is guaranteed in the normal case.
- Exploring an unknown repo means cloning and installing it first. How to do that is documented.
- Projects using Yarn Plug'n'Play (no `node_modules`) have no type layer for now.
- The dashboard is a SPA served by the CLI itself. The server listens only on `127.0.0.1` and uses a session token ([architecture](../architecture.md#server-and-dashboard)).
- Exporting to static HTML, and an editor extension, remain possible later, reusing the same graph.
