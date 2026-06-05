# CLAUDE.md

Guidance for AI agents and contributors working on this extension.

## Table of Contents

- [Project overview](#project-overview)
- [Hard constraint: GNOME 45-50](#hard-constraint-gnome-45-50)
- [API surface used](#api-surface-used)
- [Why the GSettings approach does not work](#why-the-gsettings-approach-does-not-work)
- [Procedure: verify against a GNOME version](#procedure-verify-against-a-gnome-version)
- [Procedure: add support for a new GNOME version](#procedure-add-support-for-a-new-gnome-version)
- [Syntax check](#syntax-check)
- [Manual testing](#manual-testing)
- [Files](#files)

## Project overview

`force-english-on-lock` is a GNOME Shell extension that activates the first input
source (English) when the lock screen appears, so the password field is always on
the English layout. The design rationale (why an in-shell extension rather than a
D-Bus script writing the `current` GSettings key) is recorded in
[docs/ADR](docs/ADR). Read the ADRs before changing the approach.

## Hard constraint: GNOME 45-50

`metadata.json` declares `shell-version` 45 through 50. Every change MUST keep
the extension working across all of them. GNOME's API is not stable across major
versions, so any use of a Shell/GLib symbol must be verified against each
declared version (see the procedure below). Do not assume a method exists just
because it works on the locally installed version.

## API surface used

The extension depends on the following symbols. When changing the code, keep this
list in sync and re-verify each entry against every declared version.

| Symbol                                        | Source      | Notes                                              |
| --------------------------------------------- | ----------- | -------------------------------------------------- |
| `Extension` (ESM base class)                  | gnome-shell | `js/extensions/extension.js`, since 45             |
| `Main.screenShield`                           | gnome-shell | `js/ui/main.js`, the ScreenShield singleton        |
| ScreenShield `active-changed` signal          | gnome-shell | `js/ui/screenShield.js`, fires on lock/unlock      |
| ScreenShield `active` getter                  | gnome-shell | true while the shield is active                    |
| ScreenShield `lock-screen-shown` signal       | gnome-shell | refinement hook; absent on gnome-46 (see below)    |
| `getInputSourceManager()`                     | gnome-shell | `js/ui/status/keyboard.js`, singleton accessor     |
| manager `inputSources` getter                 | gnome-shell | returns the sorted list of `InputSource`           |
| `InputSource.activate(interactive)`           | gnome-shell | switches the active layout via the manager         |
| `GLib.timeout_add` / `PRIORITY_DEFAULT` / `SOURCE_REMOVE` / `Source.remove` | GLib | stable |
| `"session-modes": ["user", "unlock-dialog"]`  | gnome-shell | metadata; keeps the extension enabled while locked |

Verified present on `gnome-45`..`gnome-50`. Exception: the
`emit('lock-screen-shown')` call was not found on the `gnome-46` branch of
`js/ui/screenShield.js`. This is non-blocking: `active-changed` (present on every
branch) is the primary hook, and `connect('lock-screen-shown', ...)` on a signal
that is never emitted is a harmless no-op.

## Why the GSettings approach does not work

Reacting to the `org.gnome.ScreenSaver` `ActiveChanged` D-Bus signal and writing
`org.gnome.desktop.input-sources current` fails when `per-window=true`: in that
mode the active layout is tracked per window inside gnome-shell
(`InputSourceManager._setPerWindowInputSource`, driven by
`global.display` `notify::focus-window`), and the `current` key does not reflect
or control it. The unlock dialog inherits the focused window's source. Only
`InputSource.activate()` — going through the real in-shell manager — affects the
lock screen. See
[docs/ADR/0001-force-via-input-source-manager.md](docs/ADR/0001-force-via-input-source-manager.md).

## Procedure: verify against a GNOME version

Do not rely on training knowledge for whether a symbol exists; check the actual
source of the target branch. Use a treeless clone so the check is cheap.

```sh
cd /tmp
git clone --filter=blob:none --no-checkout https://github.com/GNOME/gnome-shell.git
cd gnome-shell
```

Check the symbols across every supported branch in a loop:

```sh
for v in 45 46 47 48 49 50; do
  echo "=== gnome-$v ==="
  git grep -hE 'export function getInputSourceManager' origin/gnome-$v -- js/ui/status/keyboard.js
  git grep -hE '^\s*activate\(' origin/gnome-$v -- js/ui/status/keyboard.js | head -1
  git grep -hE "emit\('active-changed'\)" origin/gnome-$v -- js/ui/screenShield.js
  git grep -hE 'get active\(\)' origin/gnome-$v -- js/ui/screenShield.js
done
```

`git grep <ref>` against a treeless clone fetches only the blobs it needs, so
checking every branch in a loop is fast.

To read the actual source of the installed shell (resources are compiled into a
shared library, not shipped as plain files):

```sh
gresource extract /usr/lib/gnome-shell/libshell-*.so \
  /org/gnome/shell/ui/status/keyboard.js
```

## Procedure: add support for a new GNOME version

1. Confirm the `gnome-XX` branch exists in `gnome-shell`.
2. Run the verification procedure above for every symbol in
   [API surface used](#api-surface-used).
3. For any symbol that changed, adapt the code with runtime feature detection
   (do not branch on the shell version number) and record the change in a new
   ADR.
4. Add the version to `shell-version` in `metadata.json`.
5. Run the syntax check and a manual test.

## Syntax check

```sh
node --check extension.js
```

This validates ESM syntax without resolving `gi://` imports (Node cannot load
them, but `--check` does not execute the module).

## Manual testing

1. Symlink the repo into `~/.local/share/gnome-shell/extensions/`.
2. Restart GNOME Shell (X11: `Alt+F2`, `r`, Enter; Wayland: re-login).
3. `gnome-extensions enable force-english-on-lock@VitalyOstanin`.
4. Switch to a non-English layout in any window, lock the screen (`Super+L`),
   and confirm the password field is on the English layout.
5. Check `journalctl -b /usr/bin/gnome-shell -p warning` for errors from the
   extension.

## Files

- `extension.js` — the whole implementation.
- `metadata.json` — uuid, name, description, `shell-version`, `session-modes`,
  `version-name`.
- `stylesheet.css` — unused placeholder.
- `docs/ADR/` — architecture decision records.
