# 0003 - Hook `active-changed` and `lock-screen-shown`

Status: Accepted

## Context

The extension needs to activate English at the moment the lock screen appears.
`Main.screenShield` offers two relevant signals:

- `active-changed` — fires when the shield becomes active (lock) and inactive
  (unlock). It is present on every supported GNOME version (45-50).
- `lock-screen-shown` — fires from `_completeLockScreenShown()`, the exact moment
  the lock screen is shown. It was not found on the `gnome-46` branch.

A single hook is not enough: `active-changed` also fires on unlock (where forcing
English is undesirable), and `lock-screen-shown` is missing on one version.

## Decision

Connect both signals:

- On `active-changed`, force English only when `screenShield.active` is true, so
  unlock is ignored.
- On `lock-screen-shown`, force English and additionally schedule one re-apply
  ~250 ms later (a `GLib.timeout_add`), guarded by `screenShield.active`, to beat
  a late per-window focus event that could re-activate the previous layout.

## Consequences

- Works on all supported versions: `active-changed` is the reliable primary hook;
  `lock-screen-shown` is a refinement that is a no-op where the signal is absent
  (gnome-46).
- The extension never forces a layout on unlock.
- The single deferred re-apply is tracked and removed in `disable()` (ADR 0005).
- The 250 ms delay is a heuristic; if a layout flip is still observed on some
  hardware, the value or the number of re-applies can be revisited.
