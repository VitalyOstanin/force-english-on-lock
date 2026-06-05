# 0004 - Use `@VitalyOstanin` as the uuid namespace

Status: Accepted

## Context

A GNOME Shell extension uuid has the form `name@namespace`, where the namespace
is conventionally a domain the author controls or the author's username. The
author's other extension (`maximize-new-windows`) uses `@VitalyOstanin` (the
GitHub username), which is accurate and consistent.

## Decision

Use `force-english-on-lock@VitalyOstanin` as the uuid.

Because the uuid is the extension identifier, it must match:

1. The `uuid` field in `metadata.json`.
2. The installation directory name under
   `~/.local/share/gnome-shell/extensions/` (here, a symlink to the repository).
3. The value in the `org.gnome.shell enabled-extensions` GSettings key.

## Consequences

- The namespace is a username the author owns and is consistent with the author's
  other extension.
- For publication on extensions.gnome.org the uuid is fixed from the first
  submission, so settling it before publishing avoids a later migration.
