// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from "gi://GLib";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { getInputSourceManager } from "resource:///org/gnome/shell/ui/status/keyboard.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

export default class ForceEnglishOnLock extends Extension {
  // Activate the first configured input source (index 0, conventionally the
  // English/Latin layout). The switch goes through the real InputSourceManager
  // inside gnome-shell, which also drives the unlock dialog's layout, so it
  // works even with org.gnome.desktop.input-sources per-window=true (where the
  // GSettings "current" key does not reflect the active layout).
  _forceFirstSource() {
    const ism = getInputSourceManager();
    const first = ism?.inputSources?.[0];

    if (first) first.activate(false);
  }

  enable() {
    this._sources = new Set();
    this._shield = Main.screenShield;

    if (!this._shield) return;

    // Signals are tracked with connectObject owned by `this`; disable() drops
    // them all with a single disconnectObject(this), so no signal-id bookkeeping
    // is needed. The two connects are kept separate so that if lock-screen-shown
    // is absent on a given version, active-changed is still tracked.

    // active-changed fires on lock (active=true) and on unlock (active=false).
    // Only force English when the lock screen appears, never on unlock, so the
    // user's layout after unlocking is left alone. active-changed is present on
    // every supported GNOME version and is the reliable primary hook.
    this._shield.connectObject(
      "active-changed",
      () => {
        if (this._shield.active) this._forceFirstSource();
      },
      this,
    );

    // lock-screen-shown is the exact moment the lock screen is shown; it refines
    // the timing. It is absent on some versions (the connect is then simply a
    // no-op), so it must not be the only hook.
    this._shield.connectObject(
      "lock-screen-shown",
      () => {
        this._forceFirstSource();
        // Re-apply once after focus has settled on the lock screen, in case a
        // late per-window focus event re-activates the previous layout.
        let sourceId = 0;
        sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
          this._sources.delete(sourceId);
          if (this._shield?.active) this._forceFirstSource();
          return GLib.SOURCE_REMOVE;
        });
        this._sources.add(sourceId);
      },
      this,
    );
  }

  disable() {
    // This extension declares the "unlock-dialog" session mode (metadata.json)
    // so it stays active on the lock screen, which is the whole point: it sets
    // the input source when the lock screen appears. disable() below fully
    // disconnects every signal and removes every pending timeout, so nothing
    // keeps running once the extension is no longer active in the session mode.
    this._shield?.disconnectObject(this);
    this._shield = null;

    if (this._sources) {
      for (const id of this._sources) GLib.Source.remove(id);
      this._sources.clear();
      this._sources = null;
    }
  }
}
