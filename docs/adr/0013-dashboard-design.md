# 0013. Dashboard design: question-driven views

- Status: Accepted
- Date: 2026-10-18

## Context

Known dependency tools draw "hairballs" of nodes and lines that become unreadable on a real project; people end up exploring the code by hand. The visualization spike ([`spikes/visualization/REPORT.md`](../../spikes/visualization/REPORT.md)) confirmed that above ~300 nodes no engine makes that drawing readable. The design exploration ([`spikes/design/`](../../spikes/design/README.md)) prototyped alternative views on real data, and the project owner validated them.

## Decision

The dashboard is organised by **questions**, each with the visual form that answers it best:

| View | Question | Form |
|---|---|---|
| **Layers** | How is the monorepo organised? | Projects stacked by dependency level; links only on selection or hover; rule violations always visible |
| **Usage** | Who uses this, and what does it use? | "Used by / piece / uses" columns, grouped by project, highlighting pieces with no use or used only by tests |
| **Request flow** (inside Usage) | Which path does a request that reaches this piece take? | Three forms of the same data: grouped flow (entries → piece → exits), linear path and sequence diagram, with every intermediate step |
| **Trace** | Which APIs does an operation reach? | The operation field by field: resolver, services and external calls. Kept separate from Request flow |
| **Matrix** | Where is the coupling? | Project × project matrix ordered by level |
| **Areas** | Where is the weight, and the dead code? | An area map by lines of code, coloured by the share of exports with no production use |

Cross-cutting rules:

- **Tests and generated files hidden by default.** The dashboard shows where pieces are used, not whether they are tested. Uses in tests appear as a separate count, and a piece with tests but no real use stands out.
- **Inferred links are always shown apart** from calls in the code (framework, DataLoader, HTTP client wiring, heuristics).
- **Many paths are grouped**, with counts, and expand on demand.
- **The node-and-line graph may come back** as an additional view, mainly for small neighbourhoods. It is never the main view of a whole project.

## Consequences

- Readability is the main differentiator, and every new view has to start from a concrete question.
- Views need aggregated data (by project, folder, operation), which the server provides, rather than a raw graph.
- The prototype in `spikes/design/` is the visual reference for phase 1.
