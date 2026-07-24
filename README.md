# Threadline

[Deutsch](README.de.md) | **English**

<p align="center">
  <img src="icons/icon.svg" alt="Threadline icon" width="140">
</p>

<p align="center">
  A progressive web app for writing, searching, saving, and publishing Bluesky posts and threads.
</p>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/U7U01OC260)

## Live App

- URL: [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/)
- Repository: [https://github.com/marsrakete/threadline](https://github.com/marsrakete/threadline)

## Overview

Threadline is a static Bluesky workbench that runs directly in the browser. It helps you write and publish threads, inspect live conversations, search posts in more flexible ways, archive accounts locally, compare accounts, and load DMs for local export.

If you are new to Threadline, think of it as one app with seven focused workspaces instead of one giant composer.

## The 7 Workspaces

- `Composer`: write one post or a longer thread, split it into segments, add images, hashtags, and post settings, then publish it.
- `Search`: search Bluesky globally, search only inside one account, search reposts, or reuse saved search masks later.
- `Archive`: load an account locally and turn it into ZIP, HTML, or PDF output.
- `Thread Explorer`: open current posts and read the full live thread as a tree or mindmap.
- `Network`: inspect followers, follows, and mutuals in an interactive relationship view.
- `Analysis`: compare two accounts stylistically and temporally as a cautious extra indicator.
- `DM Archive`: load direct messages locally and prepare them for later export.

## First Start

1. Create a Bluesky app password.
2. Add your account in Threadline and sign in.
3. Open the workspace you need and start there.

Threadline uses an app password, not your main Bluesky password.

## Workspace Guide

## Composer

Purpose:
Turn raw text into a post or thread you can still fine-tune before publishing.

What to expect:
The composer takes your source text, splits it into editable segments, and keeps related things together such as images, ALT texts, hashtags, reply targets, and post settings.

Examples:
- Write a longer explanation thread and let Threadline split it into post-sized parts.
- Reply to a specific Bluesky post or continue one of your existing threads.

## Search

Purpose:
Search Bluesky more flexibly than the standard client.

What to expect:
The search workspace can run global search, scan one account's posts, scan one account's reposts, filter by media or post type, reuse saved searches, and open matching results directly in Thread Explorer.

Examples:
- Find out what one account has reposted about a topic.
- Search for posts with one or more hashtags, then save that search for later reuse.

## Archive

Purpose:
Create a readable or technical local archive of a Bluesky account.

What to expect:
You choose an account, a date range, and an archive scope. Threadline then loads posts and media into a local archive session from which you can create ZIP, HTML, or PDF output.

Examples:
- Save your own recent posts as a local ZIP archive.
- Generate a readable HTML or PDF archive for a chosen account range.

## Thread Explorer

Purpose:
Read current Bluesky conversations in a clearer structure.

What to expect:
Thread Explorer loads current posts and then opens the full live thread as a tree. You can inspect replies, images, quote posts, link cards, and counts in one place.

Examples:
- Open a current discussion and follow the reply structure visually.
- Save an interesting live thread locally as a favorite for later reopening.

## Network

Purpose:
See how an account is connected to others.

What to expect:
The network view loads followers, follows, and mutuals in waves, then shows them in an interactive stage with filters and focus cards.

Examples:
- Explore which accounts are mutuals and which only follow in one direction.
- Open one account in focus view and inspect relation details plus recent activity hints.

## Analysis

Purpose:
Compare two accounts as a cautious extra indicator, not as proof.

What to expect:
Threadline compares writing patterns, timing patterns, and some network-related signals, then shows them as a grouped result with multiple sub-scores.

Examples:
- Compare two accounts that look similar in tone or rhythm.
- Inspect whether two accounts share unusual timing or language habits.

## DM Archive

Purpose:
Load direct messages locally for later review and export.

What to expect:
You can load DM conversations into the browser, inspect them locally, and use them as the basis for later JSON, HTML, or PDF export flows.

Examples:
- Load one conversation partner's history for local backup.
- Prepare a DM archive before creating a readable export.

## Why Threadline Search Is Special

Threadline's search workspace goes beyond the standard Bluesky search in a few practical ways:

- it can scan one account's posts directly
- it can scan one account's reposts directly
- it supports saved local search masks
- it adds local post-type and media filters
- it can switch hashtag matching between `all` and `at least one`
- it can open found posts directly in Thread Explorer

## Install As An App

Threadline is a PWA and can be installed on mobile and desktop devices.

On iPhone or iPad:
- open the app in Safari
- use `Share`
- choose `Add to Home Screen`

On Android, Chrome, Edge, or desktop Chromium browsers:
- open the app
- use the install button in Threadline or the browser install option

## Technical Documentation

Technical details are intentionally kept out of this README.

- General technical documentation: [TECHNICAL.md](TECHNICAL.md)
- AT Protocol and Bluesky endpoint notes: [ATPROTO.md](ATPROTO.md)

## License

- License: [Apache License 2.0](https://marsrakete.github.io/threadline/LICENSE)

## Contact

- Email: [millux@marsrakete.de](mailto:millux@marsrakete.de)
- Bluesky: [https://bsky.app/profile/marsrakete.de](https://bsky.app/profile/marsrakete.de)
