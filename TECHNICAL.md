# Threadline Technical Notes

[Deutsch](TECHNICAL.de.md) | **English**

This file collects the more technical background information that would otherwise overload the quick-start README.

## Account Archive For Techies

- The export runs fully inside the existing PWA without a custom backend
- Posts are loaded page by page via `com.atproto.repo.listRecords` for `app.bsky.feed.post`
- Phase 1 of the filter works directly on your own repo records:
- `Full archive` keeps all of your own posts
- `Own posts only` removes your replies inside other people's threads
- Phase 2 additionally expands your own thread roots through `app.bsky.feed.getPostThread` when `My threads complete` is selected
- That step also pulls in replies from other accounts inside your own threads
- Metrics are hydrated in batches through `app.bsky.feed.getPosts`
- Images are fetched through `com.atproto.sync.getBlob` and copied into the archive with stable paths
- Large exports run in waves; the browser only keeps small resume metadata for that process
- The ZIP contains `manifest.json`, `posts.json`, and all downloaded image files
- The HTML archive is a single file with embedded images, a search field, date filters, and options for `only posts with images` and `only threads`
- PDF volumes are generated from the loaded archive model, not directly from live API responses
- The PDF volume size intentionally supports up to `1000` posts

## Network Data Model

Threadline currently uses only the official Bluesky API in the network workspace; an API is the defined technical interface through which apps request and send data.

- `Likes on those recent posts` deliberately means likes that other people gave to the focused account's recent posts
- That metric can be derived reliably and quickly for other accounts through the API
- It does not mean every like that account has given somewhere else
- Also not included yet is a full search across every visible account to see whether they liked your own posts
- That would be an interesting extra signal for closeness or relevance, but it would require many additional API requests per account
- On larger networks this would slow the workspace down significantly, create far more requests, and hit practical API limits or timeouts much sooner
- For that reason Threadline currently prefers fast, explainable best-effort signals over an expensive full interaction analysis for every single account

## Why There Are No Link Cards

### Plain-Language Explanation

Threadline is a fully static browser app and does not run its own backend. Because of that, it cannot reliably read third-party websites in order to build preview cards with title, description, and image. Links in the text still work and stay clickable on Bluesky, but Threadline does not currently generate automatic link cards.

### Technical Explanation

The blocker is cross-origin access in the browser. To read Open Graph data from another website, that site would need to allow the request through CORS. Many sites do not. Without a custom server or worker, a PWA hosted on GitHub Pages cannot reliably fetch those HTML pages and preview images, then turn them into a proper `app.bsky.embed.external` with a thumbnail. For that reason, Threadline currently sticks to clickable links via rich-text facets.

## Run Locally

Threadline is a static app. Any simple local web server is enough.

```powershell
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Credentials And Storage Notes

- Bluesky app passwords are stored locally so sessions can be renewed and multiple logins remain available after reloads
- Backups include those saved login entries, but not app passwords
- Session data, drafts, and app state are stored locally in IndexedDB
- No custom backend is required

## Project Structure

```text
.
├── app.js
├── index.html
├── manifest.webmanifest
├── styles.css
├── sw.js
├── translations.js
├── version.js
├── version.json
└── icons/
    ├── icon.svg
    └── maskable-icon.svg
```

## Update Detection

Threadline uses a visible app-version check.

- `version.js` contains the public version metadata used by the app and service worker
- the service worker fetches `version.js` with network priority
- the app checks for updates on startup
- users can manually check for updates in settings and apply a waiting update via `Reload`

When shipping changes, keep these files in sync:

- `version.js`
- `version.json` only if you keep it as an informational mirror
- `sw.js` cache-sensitive assets when cached shell contents or service-worker behavior change

## Recommended Testing

- Use a dedicated Bluesky test account, or
- create a dedicated app password just for testing

That lets you verify:

- sign-in flow
- automatic session renewal
- draft persistence
- split behavior
- manual segment editing
- saving and loading thread files
- exporting and importing backups
- images and ALT texts
- thread publishing
- update detection
