# 0001. Open source and local-first

- Status: Accepted
- Date: 2026-10-18

## Context

The tool comes from a concrete need (onboarding onto a GraphQL BFF monorepo), but the problem is common. The analysed code is often private and subject to company rules: it cannot leave the machine.

## Decision

- The project is public and open source, for anyone to use.
- Everything runs on the user's machine. No account, no server, no telemetry.
- The tool makes no network requests: it analyses projects that are already on disk ([0002](0002-node-cli-with-local-web-dashboard.md)).

## Consequences

- It can be used on private code without special approvals.
- Performance depends on the user's machine, so memory and speed are first-class requirements ([0005](0005-layered-analysis-with-provenance.md)).
- The repository must not contain code, names or details of private projects. Development uses a fictional fixture and open source repos ([0007](0007-fixture-as-ground-truth.md)).
