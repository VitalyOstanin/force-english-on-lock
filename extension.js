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

  // Force now, then re-apply after focus settles, in case a late per-window
  // focus event re-activates the previous layout.
  _forceWithRetry() {
    this._forceFirstSource();

    let sourceId = 0;
    sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
      this._sources.delete(sourceId);
      if (this._shield?.active) this._forceFirstSource();
      return GLib.SOURCE_REMOVE;
    });
    this._sources.add(sourceId);
  }

  enable() {
    this._sources = new Set();
    this._shield = Main.screenShield;

    if (!this._shield) return;

    // Remember the layout active before the lock screen appeared. The lock
    // screen does not change global.display.focus_window, so forcing the first
    // source below also overwrites the per-window layout of the still-focused
    // work window (activate() runs _changePerWindowSource for focus_window).
    // disable() re-activates this source on unlock to restore that window.
    const ism = getInputSourceManager();
    this._restoreSource = ism?.currentSource ?? null;

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
      () => this._forceWithRetry(),
      this,
    );

    // Running only in the "unlock-dialog" session mode, enable() itself signals
    // that the lock screen is appearing. The shield may already have emitted
    // active-changed / lock-screen-shown before this async enable() ran (e.g. an
    // idle fade without animation), so force once here instead of relying solely
    // on the signals above.
    this._forceWithRetry();
  }

  disable() {
    // Runs on unlock (the session leaves "unlock-dialog"); disconnect all
    // signals and drop pending timeouts so nothing keeps running once disabled.
    this._shield?.disconnectObject(this);
    this._shield = null;

    if (this._sources) {
      for (const id of this._sources) GLib.Source.remove(id);
      this._sources.clear();
      this._sources = null;
    }

    // Restore the pre-lock layout: re-activating it rewrites the per-window
    // source of the now-focused work window back from English, so the user
    // returns to the layout they had before locking.
    if (this._restoreSource) {
      this._restoreSource.activate(false);
      this._restoreSource = null;
    }
  }
}
