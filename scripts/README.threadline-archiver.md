# Threadline PowerShell Archiver

[Deutsch](README.threadline-archiver.de.md) | **English**

This document describes the standalone PowerShell archiver for large Threadline account exports.

## Status

Current script:

- `scripts/archive-threadline.ps1`
- `scripts/archive-threadline-sqlite.ps1` (new SQLite-based scaffold)

Sample config:

- `scripts/threadline-archiver.config.sample.json`
- `scripts/threadline-archiver-sqlite.config.sample.json`

## Goal

The PowerShell archiver is intended for long-running or very large archive jobs that are awkward inside a browser session.

It can:

- authenticate against Bluesky / AT Protocol with the same app-password model as Threadline
- fetch account archives with stronger resume behavior and predictable backoff handling
- write the **same archive JSON structure** that Threadline already understands in the browser
- optionally save media assets beside that JSON
- produce ZIP archives that can later be loaded directly back into Threadline

The browser app remains the interactive front end. The PowerShell tool is the heavyweight batch runner.

## Current Scope

The first implementation focuses on a robust MVP:

- app-password login
- own account or other actor as source
- date-range filtering
- archive JSON output compatible with Threadline import
- avatar, image, and link-card-thumb downloads
- checkpoint files and resume support
- optional ZIP packaging

Current limitations of the first version:

- `threads` and `thread_roots` are currently mapped to the base post-selection logic
- `includeConversationContext` is stored in the manifest but not expanded yet
- the script aims at JSON-contract compatibility first, not full feature parity with every browser archive mode

## SQLite Scaffold

There is now a second, intentionally separate script:

- `scripts/archive-threadline-sqlite.ps1`

It starts the next-generation architecture:

- SQLite as the internal working store
- file-system asset folders beside the database
- final export to `manifest.json` and optional `posts.json`
- resume state stored inside SQLite instead of NDJSON sidecars

Current scope of the SQLite script:

- app-password login
- source actor resolution
- date filtering
- paged fetch into SQLite with batched UPSERTs
- resume against an existing `threadline-archive.sqlite`
- export from SQLite to `manifest.json` and, when needed, `posts.json` via `-CreatePostsJson`
- incremental refresh of an existing archive via `-Update`

Current state of the SQLite script:

- media / avatar / link-card download phases are wired
- resume exists for fetch, metrics, avatar, media, export, and ZIP phases
- `posts.json` is now optional and only created with `-CreatePostsJson`
- `-Update` fetches only posts newer than the first already archived post and then only runs the pending follow-up phases for those new items
- `includeConversationContext` now expands matching archive posts with visible parent/reply context via `app.bsky.feed.getPostThread`

Prerequisite:

- install the official SQLite command-line tools
- the script expects `sqlite3.exe` either in `PATH` or at the configured `sqliteExePath`

## Update Mode

The SQLite archiver can refresh an existing archive in place:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline-sqlite.ps1 `
  -ConfigPath .\scripts\threadline-archiver-sqlite.config.sample.json `
  -Update
```

You can enable full conversation context in two ways:

- in the JSON config file with `"includeConversationContext": true`
- on the command line with the switch `-IncludeConversationContext`

Example with the command-line switch:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline-sqlite.ps1 `
  -ConfigPath .\scripts\threadline-archiver-sqlite.config.sample.json `
  -IncludeConversationContext `
  -Update
```

Behavior of `-Update`:

- requires an existing archive with `threadline-archive.sqlite`
- scans the account again from the current top
- stops once it reaches the first post already known in the archive
- therefore downloads only newly added posts
- then processes only still-pending metrics, avatars, media, and export output for those new posts
- if `includeConversationContext` is enabled, update mode also backfills conversation context for older primary archive posts that did not have it yet

If the archive is still empty, `-Update` falls back to a normal initial run.

Practical note:

- `-IncludeConversationContext` and `-Update` are meant to work together
- `-Resume` can be combined with `-Update`, but in most normal refresh runs it is redundant because `-Update` already continues from the existing archive state

## Why A Separate Tool

Compared with the browser-based archive workspace, a standalone PowerShell process has clear advantages for large jobs:

- no browser memory ceiling for long runs
- easier checkpoint files and resume state on disk
- better control over backoff, retry, and overnight runs
- easier logging and diagnostics
- easier automation through task schedulers or scripts

## Compatibility Contract

The most important rule is:

**The PowerShell archiver must emit the same archive payload shape that Threadline exports today.**

That means the resulting data should still be loadable through the current browser import path.

At minimum, the generated archive should remain compatible with:

- `manifest.json`
- `posts.json`
- archive ZIP imports in Threadline
- the HTML conversion script `convert-threadline-archive-to-html.ps1`

## Expected Output Shape

The standalone tool should continue to produce an archive equivalent to the current Threadline archive model:

### `manifest.json`

Expected top-level responsibilities:

- archive schema version
- export timestamp
- app / tool version
- account identity
- applied filters
- counts for posts and images
- optional session / progress metadata

### `posts.json`

Expected per-post responsibilities:

- post URI, CID, rkey
- author metadata
- timestamps
- text
- facets / langs where present
- reply metadata where present
- counts / metrics when available
- image entries with paths and ALT text
- optional external-card metadata

### Asset folders

Expected asset groups:

- `images/`
- `avatars/`
- `link-cards/`
- optional metadata folders such as `_meta/`

The exact folder layout should follow the current Threadline export conventions so the browser importer and the PowerShell HTML converter can keep working without translation layers.

## Command Surface

The current command surface of `archive-threadline.ps1` is centered around parameters such as:

- `-Identifier`
- `-AppPassword`
- `-Service`
- `-SourceActor`
- `-From`
- `-To`
- `-Scope`
- `-ContentMode`
- `-IncludeConversationContext`
- `-MaxPosts`
- `-OutputDirectory`
- `-Resume`
- `-Update`
- `-WaitProfile`
- `-ConfigPath`
- `-AllowSvg`

## Quick Start

Example with config file:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline.ps1 `
  -ConfigPath .\scripts\threadline-archiver.config.sample.json `
  -OutputDirectory C:\Temp\threadline-archive `
  -CreateZip
```

Config notes:

- use Windows paths either with escaped backslashes such as `"C:\\Temp\\threadline-archive"` or simpler with forward slashes such as `"C:/Temp/threadline-archive"`
- use `from` / `to` as `YYYY-MM-DD`
- `maxPosts` must be a number, not empty
- `includeConversationContext` can be stored in the config file, or overridden on the command line with `-IncludeConversationContext`
- SVG files are replaced with a small PNG dummy image by default; use `-AllowSvg` only when you intentionally want to disable that safeguard

Example without config file:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline.ps1 `
  -Identifier your-handle.bsky.social `
  -AppPassword xxxx-xxxx-xxxx-xxxx `
  -OutputDirectory C:\Temp\threadline-archive `
  -ContentMode full `
  -Scope all `
  -MaxPosts 2000 `
  -CreateZip
```

## Config File

A config file can cover the stable, repetitive values:

- identifier / handle
- app password
- service / PDS base if needed
- default output directory
- wait profile
- retry settings
- preferred archive mode defaults

The app password should never be committed to the repository.

## Wait Profiles

The browser app currently mixes:

- reactive backoff for `429` / `503` / `504`
- voluntary pauses between larger page blocks

The PowerShell archiver keeps the same philosophy but expresses it as named profiles, for example:

- `normal`
- `aggressive`
- `night`

Even in aggressive mode, hard rate-limit signals such as `Retry-After` should always be respected.

## Division Of Labor

Recommended split:

- **Browser / PWA**
  - account selection
  - interactive archive filtering
  - preview and inspection
  - ZIP import and browsing
  - thread-specific tools like unroll and edit checks

- **PowerShell archiver**
  - long-running bulk fetches
  - resume from checkpoints
  - incremental refreshes of existing archives
  - structured logging
  - large asset downloads
  - unattended runs

## Relation To Existing Script

`convert-threadline-archive-to-html.ps1` remains useful even with a full archiver in place.

That converter solves a different problem:

- input: an already exported Threadline ZIP or an unpacked archive folder
- output: a local folder-based HTML archive whose generated HTML reads assets from `archive-assets/`, or optionally an inline-asset HTML via `-InlineAssets`

The standalone archiver sits **before** that step and produces the archive ZIP / JSON in the first place.
