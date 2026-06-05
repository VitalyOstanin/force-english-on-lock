# Force English On Lock

A minimal GNOME Shell extension that activates the first input source (the
English/Latin layout) whenever the lock screen appears, so the password field is
always on the English layout — even if you locked the screen while typing in
another language.

## Table of Contents

- [What it does](#what-it-does)
- [Why an extension instead of a key/script](#why-an-extension-instead-of-a-keyscript)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [Development](#development)
- [How it works](#how-it-works)
- [Limitations](#limitations)
- [License](#license)

## What it does

When the GNOME Shell lock screen is shown, the extension activates the first
configured input source (index 0). Order your input sources with the
English/Latin layout first (GNOME Settings -> Keyboard -> Input Sources), and the
password entry will always start in English.

Per-window layout in the normal session
(`org.gnome.desktop.input-sources per-window=true`) is preserved: the extension
only acts on the lock screen, and after unlocking your window's remembered layout
is restored.

## Why an extension instead of a key/script

The obvious approach — react to the screen-lock D-Bus signal from a background
script and write `org.gnome.desktop.input-sources current` — does not work when
`per-window` is enabled. In that mode the active layout is tracked per window by
gnome-shell internally, and the `current` GSettings key neither reflects nor
controls it; the unlock dialog inherits the layout of the window that was focused
at lock time.

The switch must go through gnome-shell's own `InputSourceManager`, which drives
the unlock dialog's layout. That object is only reachable from inside the shell,
i.e. from an extension. See
[docs/ADR/0001-force-via-input-source-manager.md](docs/ADR/0001-force-via-input-source-manager.md).

## Compatibility

GNOME Shell 45-50.

The extension uses only long-stable APIs (`Main.screenShield`, its
`active-changed` signal, `getInputSourceManager()` and `InputSource.activate()`),
verified against the `gnome-45`..`gnome-50` branches. See
[CLAUDE.md](CLAUDE.md) for the verification procedure.

## Installation

### From source

```sh
git clone https://github.com/VitalyOstanin/force-english-on-lock.git
ln -s "$(pwd)/force-english-on-lock" \
  ~/.local/share/gnome-shell/extensions/force-english-on-lock@VitalyOstanin
```

Restart GNOME Shell:

- X11: press `Alt+F2`, type `r`, press Enter.
- Wayland: log out and log back in.

Enable it:

```sh
gnome-extensions enable force-english-on-lock@VitalyOstanin
```

## Development

The repository itself can live anywhere (for example
`~/devel/force-english-on-lock`); a symlink under
`~/.local/share/gnome-shell/extensions/` makes GNOME Shell pick it up.

Check the syntax without loading the extension:

```sh
node --check extension.js
```

See [CLAUDE.md](CLAUDE.md) for the procedure to verify and update the extension
against new GNOME Shell versions.

## How it works

- `enable()` connects to `Main.screenShield`:
  - `active-changed` — when the shield becomes active (lock), activate input
    source 0.
  - `lock-screen-shown` — the exact moment the lock screen is shown; activate
    again and schedule a single re-apply ~250 ms later in case a late
    per-window focus event re-activates the previous layout.
- The activation calls `getInputSourceManager().inputSources[0].activate(false)`,
  which switches the layout through gnome-shell's real input source manager.
- `metadata.json` declares `"session-modes": ["user", "unlock-dialog"]` so the
  extension keeps running on the lock screen (extensions are otherwise disabled
  there); see
  [docs/ADR/0002-run-on-lock-screen-session-mode.md](docs/ADR/0002-run-on-lock-screen-session-mode.md).
- `disable()` disconnects every signal handler and removes the pending timeout
  source.

## Limitations

- "English" means whatever input source is first in your list (index 0). If the
  first source is not a Latin layout, change the order in GNOME Settings.
- The extension never changes the layout during normal use; it only acts on the
  lock screen.

## License

[GPL-2.0-or-later](LICENSE). GNOME Shell is GPL-2.0-or-later, and extensions are
derived works that must use compatible terms.
