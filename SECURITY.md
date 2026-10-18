# Security policy

codestrata runs locally and only reads the project it analyses: it makes no network requests and never runs the analysed project's code without an explicit request ([ADR 0001](docs/adr/0001-open-source-local-first.md), [ADR 0008](docs/adr/0008-never-run-project-code.md)). A vulnerability is anything that breaks those promises, or lets a web page, a file in an analysed project or another local user read data or run code through codestrata.

## Supported versions

The project has not been released yet. Once it is, only the latest release receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability**.

Include what you found, how to reproduce it and the impact you expect. You should get a first answer within a week. Once a fix is released, the report is disclosed with credit to you, unless you prefer otherwise.
