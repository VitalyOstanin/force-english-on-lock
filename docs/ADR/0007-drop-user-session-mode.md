# 0007 - Drop the `user` session mode, run only in `unlock-dialog`

Status: Accepted

Supersedes the session-mode decision of
[0002](0002-run-on-lock-screen-session-mode.md).

## Context

ADR 0002 declared `"session-modes": ["user", "unlock-dialog"]` so the extension
stays enabled across the lock transition and its already-connected signal
handlers fire while the lock screen is shown.

During the extensions.gnome.org review (review 71978), the reviewer asked to
remove `user` from the session modes: the extension does nothing useful in the
normal session, so being enabled there is unnecessary. Keeping `user` only
broadens the surface that runs in a regular session for no functional gain.

Removing `user` changes when `enable()` runs. With only `unlock-dialog`, the
shell enables the extension at the moment the session enters that mode, i.e.
when the lock screen appears (`screenShield.activate()` ->
`Main.sessionMode.pushMode('unlock-dialog')`). That switch is handled
asynchronously by the extension system (`_sessionUpdated()` starts with
`await`), while `screenShield.activate()` continues synchronously into
`_resetLockScreen()`. In the no-animation path (idle/timeout fade), the shield
emits `active-changed` and `lock-screen-shown` synchronously, before the async
`enable()` has connected its handlers. In that case the signal handlers alone
would miss the lock event and the layout would not be forced.

## Decision

Declare only the lock-screen mode in `metadata.json`:

```json
"session-modes": ["unlock-dialog"]
```

Because the extension now runs only in `unlock-dialog`, the call to `enable()`
itself signals that the lock screen is appearing. `enable()` therefore forces
the first input source once on entry (with the same delayed re-apply used for
`lock-screen-shown`), instead of relying solely on the `active-changed` /
`lock-screen-shown` handlers. The handlers are kept for the cases where
`enable()` runs early and for re-locks within the same `unlock-dialog` session.

## Consequences

- The extension is no longer enabled in the normal `user` session; it loads only
  while the lock screen is active, which matches its single purpose.
- The layout is forced reliably even on the no-animation lock path, because the
  force is driven by `enable()` rather than by signals that may precede it.
- `disable()` must still release every resource (ADR 0005); it now runs on every
  unlock, when the session leaves `unlock-dialog`.
