# 0006 - Declare and verify support for GNOME 45-50

Status: Accepted

## Context

`metadata.json` must list the `shell-version` values the extension supports.
GNOME's JavaScript API is not stable across major versions, so a declared version
is only honest if the symbols the extension uses are confirmed to exist on that
version's branch.

The extension was developed and tested on GNOME Shell 47 (the locally installed
version). The author's other extension supports 45-50, and this one uses only
long-stable APIs.

## Decision

Declare `shell-version` `["45", "46", "47", "48", "49", "50"]`, and verify every
used symbol against the `gnome-45`..`gnome-50` branches of `gnome-shell` with
treeless-clone `git grep` (procedure in [CLAUDE.md](../../CLAUDE.md)).

Verification result: `getInputSourceManager`, `InputSource.activate`, the manager
`inputSources` getter, and ScreenShield's `active-changed` signal and `active`
getter are present on all six branches. The `lock-screen-shown` signal is present
on 45 and 47-50 but was not found on 46; it is only a refinement hook, so the
extension still works on 46 via `active-changed` (ADR 0003).

## Consequences

- The declared range is backed by source verification, not assumption.
- The ESM `Extension` base class and `resource://` import paths require GNOME 45+;
  earlier versions are out of scope.
- Adding a new version requires re-running the verification procedure
  (CLAUDE.md) before extending `shell-version`.
