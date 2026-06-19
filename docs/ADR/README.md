# Architecture Decision Records

This directory records the technical decisions made for the
`force-english-on-lock` extension, using a lightweight ADR format
(Context / Decision / Consequences).

## Index

| ID                                                       | Title                                                  | Status   |
| -------------------------------------------------------- | ------------------------------------------------------ | -------- |
| [0001](0001-force-via-input-source-manager.md)           | Force the layout via the in-shell InputSourceManager   | Accepted |
| [0002](0002-run-on-lock-screen-session-mode.md)          | Run on the lock screen via the `unlock-dialog` mode    | Accepted |
| [0003](0003-hook-active-changed-and-lock-screen-shown.md)| Hook `active-changed` and `lock-screen-shown`          | Accepted |
| [0004](0004-uuid-namespace.md)                           | Use `@VitalyOstanin` as the uuid namespace             | Accepted |
| [0005](0005-resource-cleanup-on-disable.md)              | Track and release all resources on disable             | Accepted |
| [0006](0006-support-gnome-45-to-50.md)                   | Declare and verify support for GNOME 45-50             | Accepted |
| [0007](0007-drop-user-session-mode.md)                   | Drop the `user` session mode, run only in `unlock-dialog` | Accepted |
| [0008](0008-restore-pre-lock-layout-on-unlock.md)        | Restore the pre-lock layout on unlock                  | Accepted |
