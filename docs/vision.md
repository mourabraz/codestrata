# Vision

## The problem

Anyone joining a large project, especially a monorepo, needs weeks to build a mental model of the code: where things are, who uses what, what breaks if something changes. Today's tools solve parts of this:

- **File dependency graphs** (dependency-cruiser, madge, `nx graph`) show imports, but they don't say *where this function is used*, and they don't follow calls through objects (`context.service.method()`). They also draw "hairballs" of nodes and lines that become unreadable on a real project, so people end up exploring the code by hand.
- **The editor** (go to definition, find references) is precise, but answers one question at a time and gives no overall picture.
- **None of them** understands the architecture of a GraphQL backend: which resolver handles a field, which services it calls, and which external APIs an operation ends up reaching.

## The proposal

An open source tool you point at a project **on disk**, with its dependencies already installed (the project you are working on). It analyses it **locally** and opens a **web dashboard** with a navigable map of the code:

- from the big picture (the monorepo's projects and the dependencies between them) down to the detail (files, functions, calls);
- centred on concrete questions: *who uses this?*, *what does this use?*, *what breaks if I change this?*;
- with framework-specific layers, starting with **GraphQL**: schema → resolver → service → external API, operations and Federation;
- with analyses that point out problems: cycles, dead code, broken architecture rules, undeclared dependencies, schema fields no operation uses.

## Who it is for

- **People joining a project** who need to understand it quickly (the case that motivated the tool: onboarding onto a GraphQL BFF monorepo that is about to be refactored).
- **People refactoring**, who need to know the impact of a change and where the debt is.
- **People migrating an architecture**, for example from a modular monolith to GraphQL Federation, who need to know which modules share services and who owns each type.
- **Tech leads and reviewers**, who want to check architecture rules objectively.

## Use cases

1. *"I'm about to change `getUser`. Who calls it, directly or indirectly?"* The ego view of a symbol, N hops up and down.
2. *"Is this really used, or only by the tests?"* A function with several tests and no real use has to stand out.
3. *"How is this monorepo organised?"* A map of projects, with drill-down into files and symbols.
4. *"Which APIs does this client query reach?"* An operation explorer: field → resolver → service → retriever → endpoint.
5. *"What stops this module from becoming a subgraph?"* The services it shares with other modules and the types it references.
6. *"Where is the debt?"* Findings: cycles, dead code, broken rules, unused fields.

## Goals

- **Readable before complete**: each view starts from a question and uses the visual form that answers it best (layers, usage columns, traces, matrix, areas). The node-and-line graph only appears for small neighbourhoods. Being more readable than existing tools is the main differentiator.
- **Fast and progressive**: the structural map appears within seconds and precision improves in the background. A slow analysis is not useful.
- **Precise and honest**: every link says how it was obtained (syntax, types or heuristic). The tool does not invent links, nor hide the ones it could not resolve.
- **Local and private**: the tool makes no network requests. The code never leaves the machine.
- **Extensible**: the core is language-independent; languages, frameworks and monorepo kinds plug in as adapters.

## Non-goals

- It is not a linter, and it does not replace the compiler or the tests.
- It is not a cloud service and needs no account.
- It does not analyse remote repositories. The project must be on disk; cloning it and installing its dependencies is up to the user.
- It does not run the analysed project's code (no installing dependencies, no scripts, no codegen) unless the user explicitly asks.
- It does not aim to be exact for dynamic code (`eval`, calls by arbitrary string, reflection). In those cases it flags the uncertainty.
- At first, it does not support every language or every GraphQL style. The focus is TypeScript and schema-first GraphQL.

## Principles

1. **Local-first**: everything runs on the user's machine. LLM features, if any, are optional, isolated and explicitly switched on.
2. **Layers**: first what is cheap and certain, then what is expensive and precise.
3. **Provenance**: every edge of the graph records how it was obtained and with what confidence.
4. **Verifiable**: behaviour is tested against a fixture with the written "truth" (`fixtures/streaming-bff/EXPECTED.md`).
5. **Generic with adapters**: patterns of a specific project (for example a string-keyed mapper registry) come in through configuration, not through code specific to that project.
