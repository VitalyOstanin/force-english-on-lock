# 0008 - Restore the pre-lock layout on unlock

Status: Accepted

## Context

ADR 0001 forces the lock-screen layout by calling
`InputSource.activate(false)` on the first input source. With
`per-window` layout enabled (`org.gnome.desktop.input-sources per-window`),
this has an unintended side effect.

Runtime diagnosis (gnome-shell 50, observed via `Shell.Eval`) established:

- The lock screen does not change `global.display.focus_window`. Throughout the
  locked state, `focus_window` keeps pointing at the work window that was
  focused before locking. `_getCurrentWindow()` in
  `js/ui/status/keyboard.js` has no lock-screen branch, so it returns that
  window.
- `InputSource.activate()` runs `_currentInputSourceChanged()` ->
  `_changePerWindowSource()` synchronously, which stores the now-current source
  into `focus_window._currentSource` - i.e. into the per-window memory of the
  work window.
- Consequently, forcing English on lock overwrites the work window's saved
  layout. On unlock, the per-window logic restores `focus_window._currentSource`
  (now English), so the user is left on English instead of the layout they had.

This affected v1.0 already; it is not specific to running only in
`unlock-dialog` (ADR 0007). Any force, from any handler, runs while
`focus_window` is the work window.

There is no public API to set a layout for the password field alone:
`unlockDialog.js` does not manage input sources; the field uses the global
current source, which is what the extension switches.

## Decision

Remember the layout active before the lock screen appears and restore it on
unlock:

- In `enable()` (called when the session enters `unlock-dialog`), before the
  first force, capture `getInputSourceManager().currentSource` into
  `this._restoreSource`.
- In `disable()` (called when the session leaves `unlock-dialog`, i.e. on
  unlock), call `this._restoreSource.activate(false)`. Re-activating the saved
  source rewrites the now-focused work window's per-window source back from
  English.

Both steps use only the public `activate()` / `currentSource` API; no private
window fields are touched.

## Consequences

- The work window keeps its pre-lock layout after unlock; the extension's effect
  is confined to the lock screen.
- The restore relies on `disable()` running on unlock with the work window
  focused (verified: `focus_window` does not change during lock/unlock).
- If the captured source is gone by unlock (e.g. layout list changed while
  locked), the restore is skipped; this is acceptable and non-fatal.
