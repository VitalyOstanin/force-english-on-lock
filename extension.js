// SPDX-License-Identifier: GPL-2.0-or-later

import GLib from "gi://GLib";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { getInputSourceManager } from "resource:///org/gnome/shell/ui/status/keyboard.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

export default class ForceEnglishOnLock extends Extension {
  // Activate input source index 0 via InputSourceManager (drives the unlock
  // dialog layout); works with per-window=true, where GSettings "current" does not.
  _forceFirstSource() {
    const ism = getInputSourceManager();
    const first = ism?.inputSources?.[0];

    if (first) first.activate(false);
  }

  enable() {
    this._sources = new Set();
    this._shield = Main.screenShield;

    if (!this._shield) return;

    // Two separate connects so active-changed still works if lock-screen-shown
    // is absent on a given version. Force only on lock (active=true), not unlock.
    this._shield.connectObject(
      "active-changed",
      () => {
        if (this._shield.active) this._forceFirstSource();
      },
      this,
    );

    // lock-screen-shown refines timing but is absent on some versions, so it
    // must not be the only hook.
    this._shield.connectObject(
      "lock-screen-shown",
      () => {
        this._forceFirstSource();
        // Re-apply after focus settles, in case a late per-window focus event
        // re-activates the previous layout.
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
    // Runs in the "unlock-dialog" session mode; disconnect all signals and drop
    // pending timeouts so nothing keeps running once disabled.
    this._shield?.disconnectObject(this);
    this._shield = null;

    if (this._sources) {
      for (const id of this._sources) GLib.Source.remove(id);
      this._sources.clear();
      this._sources = null;
    }
  }
}
