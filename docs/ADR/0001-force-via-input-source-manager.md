# 0001 - Force the layout via the in-shell InputSourceManager

Status: Accepted

## Context

The goal is to make the unlock dialog's password field always use the English
layout, regardless of which layout was active when the screen locked.

The first approach was external and did not require an extension: a background
service ran `gdbus monitor` on `org.gnome.ScreenSaver`, and on the
`ActiveChanged(true)` signal it wrote
`org.gnome.desktop.input-sources current 0` via `gsettings`.

This did not work. With `org.gnome.desktop.input-sources per-window=true`, the
active layout is tracked per window inside gnome-shell
(`InputSourceManager._setPerWindowInputSource`, connected to `global.display`
`notify::focus-window`). The `current` GSettings key does not reflect the active
layout in that mode, and writing it does not change what the unlock dialog uses.
Debug logging confirmed the lock signal was received and `current` was already
`0` at lock time, yet the lock screen still showed the previous layout.

The layout shown by the unlock dialog is governed by gnome-shell's own
`InputSourceManager`. That object is only reachable from inside the shell
process, i.e. from an extension.

## Decision

Switch the layout by calling, from inside the shell:

```js
getInputSourceManager().inputSources[0].activate(false);
```

`InputSource.activate()` emits the `activate` signal that the manager handles,
switching `_currentSource` to the first source. Because this is the same manager
that drives the unlock dialog, the lock screen follows it. The per-window logic
only re-activates a source on `notify::focus-window`, and the lock screen has no
normal focused window, so the activation is not overridden.

## Consequences

- Works with `per-window=true` and `per-window=false`.
- After unlocking with `per-window=true`, the focused window's remembered layout
  is restored on the next focus event, so normal use is unaffected.
- The fix must run inside gnome-shell, which is why this is an extension rather
  than a standalone script or systemd service.
- "English" is whichever source is at index 0; the user must order the English
  layout first.
