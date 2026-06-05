# 0002 - Run on the lock screen via the `unlock-dialog` mode

Status: Accepted

## Context

GNOME Shell runs in different session modes. By default an extension is active
only in the `user` mode and is disabled when the session switches to the
`unlock-dialog` mode (the lock screen). The shell calls `disable()` on lock and
`enable()` on unlock.

This extension's whole purpose is to act when the lock screen appears. If it is
disabled at that moment, its `active-changed` and `lock-screen-shown` handlers
are disconnected before they can fire, and nothing happens.

## Decision

Declare both modes in `metadata.json`:

```json
"session-modes": ["user", "unlock-dialog"]
```

With `unlock-dialog` listed, the extension stays enabled across the lock
transition; `enable()` is not re-called, the signal handlers remain connected,
and they fire while the lock screen is shown.

## Consequences

- The extension runs while the screen is locked. Its code path is minimal (only
  activates an input source), which is appropriate for the locked context.
- `disable()` must still release every resource, because the shell may disable
  the extension at other times (ADR 0005).
- Extensions that request `unlock-dialog` should do as little as possible there;
  this one only calls `InputSource.activate()`.
