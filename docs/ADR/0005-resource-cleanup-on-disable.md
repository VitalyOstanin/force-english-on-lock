# 0005 - Track and release all resources on disable

Status: Accepted

## Context

GNOME Shell enables and disables extensions repeatedly (for example whenever the
session mode changes). An extension MUST fully undo its effects in `disable()`;
leaked signal handlers or timers accumulate and can fire after the extension is
gone, which is especially harmful for an extension that also runs in the
`unlock-dialog` mode (ADR 0002).

This extension creates disposable resources:

- Two signal handlers on `Main.screenShield` (`active-changed`,
  `lock-screen-shown`).
- A short-lived `GLib.timeout_add` source scheduled on `lock-screen-shown`.

## Decision

Track every disposable resource and release all of them in `disable()`:

- The screenShield handler ids, kept in an array, disconnected from the shield.
- Every pending timeout source id, kept in a set; each id is removed from the set
  when its callback runs, and any still-pending id is removed via
  `GLib.Source.remove` in `disable()`.

All tracking fields are reset to `null` after cleanup so a subsequent `enable()`
starts from a clean state.

## Consequences

- No signal handlers or timers survive `disable()`.
- New disposable resources added later must be tracked the same way.
