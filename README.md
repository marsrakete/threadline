# Threadline

[Deutsch](README.de.md) | **English**

<p align="center">
  <img src="icons/icon.svg" alt="Threadline icon" width="140">
</p>

<p align="center">
  A progressive web app for writing, splitting, saving, and publishing Bluesky threads with images, hashtags, and local backup support.
</p>

<p align="center">
  <a href="https://ko-fi.com/U7U01OC260">Support me on Ko-Fi<br />
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-Fi" width="140">   
  </a>
</p>


[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/U7U01OC260)

## Live App

- URL: [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/)
- Repository: [https://github.com/marsrakete/threadline](https://github.com/marsrakete/threadline)

## Overview

Threadline is a static PWA for publishing Bluesky threads. It connects with a Bluesky app password, stores drafts locally in the browser, and helps turn longer text into editable thread segments. Images, hashtags, segment edits, and other settings persist locally and can also be exported or saved as a complete thread file.

## Feature Set

- Bluesky sign-in with app password
- Local session renewal without a custom backend
- Multilingual UI: German, English, French
- Automatic browser-language detection with English fallback
- Manual language selection in settings, including `Automatic`
- Installable PWA with service worker, offline app shell, and install button
- In-app help dialog based on the README
- Update detection via `version.json`, including manual update checks
- Status area and recent posting history

## Writing And Splitting

- Large composer field for the source text
- Automatic splitting into thread segments once the text exceeds 300 characters
- Splits try to break on word boundaries
- Existing line breaks are preserved as well as possible
- Optional `1/x` counters, always appended on their own line
- Optional thread emoji `⤵️` for every segment except the last one, inserted before an active counter
- Manual hard split marker with `%%`
- Thread segments can be edited after splitting
- As soon as a segment is edited manually, the composer is locked to prevent accidental overwrites
- `Ignore change` only unlocks the composer; it does not rerender the existing thread preview

## Hashtag Manager

- Hashtags can be entered with or without `#`
- Original casing is preserved, for example `#mdRzA`
- Displayed as a clickable word cloud
- Individual hashtags can be selected, edited, or deleted
- Editing happens in a UI popup
- Selected hashtags are inserted together into the first or last thread segment
- Hashtags are posted as Bluesky rich-text facets so they become clickable

## Images Per Thread Segment

- Up to 4 images can be attached to each segment
- Images are shown below their segment as compact previews
- Each image stays assigned to its specific thread segment
- Images can be reordered left or right within a segment
- A trash button removes individual images
- ALT text can be edited in a dedicated popup
- An image editor supports:
- moving the crop
- zooming
- horizontal flip
- vertical flip
- rotating 90 degrees to the left
- If an image is too large for Bluesky, it is highlighted and posting is blocked
- The editor then offers the hint `Zoom in and define a crop` plus `Reduce size (lossy)`
- Both the original file size and the export size for Bluesky are shown

## Inclusion And ALT Texts

- ALT text can be maintained per image
- In settings you can enable `ALT text required: I want to create inclusive posts`
- This option is enabled by default
- When enabled, posting is only allowed if every image has ALT text
- Missing ALT text is visibly marked
- A warning appears above the publish button

## Saving, Loading, And Backup

### Automatic Local Persistence

- Source text survives reloads and restarts
- Thread segments survive reloads, even when edited manually
- Images, ALT texts, hashtags, language, history, and other settings persist locally
- Data is stored in `IndexedDB`, not `localStorage`

### Save And Load Thread Files

- A complete thread can be saved as a file
- The saved thread includes:
- source text
- current thread segments
- images per segment
- ALT texts
- image edit state
- hashtags and placement
- A saved thread can later be loaded again
- Loading asks for confirmation before replacing the current thread
- Import restores the stored thread segments exactly as saved, regardless of how the current source text would split today

### Settings Backup

- Settings can be exported and imported from the settings dialog
- The backup includes, among other things:
- language preference
- tips visibility
- ALT-text requirement
- hashtags
- selected hashtags
- hashtag placement
- posting history
- Hashtags are merged during import
- Existing hashtags stay
- New hashtags are added
- Duplicates are ignored
- Important: the backup explicitly does **not** include the Bluesky account or password

### Account Archive

- The dedicated `Account archive` area can back up your own Bluesky posts together with their images
- You can also choose an `Archive type` before loading:
- `Full archive`: loads all of your own posts and all of your own replies, including replies inside other people's threads
- `Own posts only`: loads your own top-level posts and your own replies only inside your own threads, but skips your replies in foreign threads
- `My threads complete`: loads your own posts, your own replies inside those threads, and replies from other accounts inside your own threads
- The normal user workflow is:
1. Choose the range: all posts, a single year, or a custom date range
2. Choose the archive type: full archive, own posts only, or my threads complete
3. Use `Load next wave` to fetch the next posts and images into the current archive session
4. Pause or cancel if needed and continue later from the same checkpoint
5. Use `Save archive as ZIP` to store a technical backup containing posts, metadata, and images
6. Use `Generate HTML archive` to create an offline-readable version with search, filters, and collapsible threads
7. Use `Generate PDF volumes` to create a paginated PDF version from that same loaded archive
- For large accounts, the export should ideally be done on a desktop device with plenty of free storage and in multiple waves

### Account Archive For Techies

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

## Publishing To Bluesky

- Short text can be sent as a single post
- Longer text is published as a thread
- Images are uploaded together with their assigned segment
- After a successful publish, a dialog shows a link to the created post
- Progress and errors are shown in UI popups
- Hashtags, mentions, and links are posted as rich-text facets so they become clickable in Bluesky

## Why There Are No Link Cards

### Plain-Language Explanation

Threadline is a fully static browser app and does not run its own backend. Because of that, it cannot reliably read third-party websites in order to build preview cards with title, description, and image. Links in the text still work and stay clickable on Bluesky, but Threadline does not currently generate automatic link cards.

### Technical Explanation

The blocker is cross-origin access in the browser. To read Open Graph data from another website, that site would need to allow the request through CORS. Many sites do not. Without a custom server or worker, a PWA hosted on GitHub Pages cannot reliably fetch those HTML pages and preview images, then turn them into a proper `app.bsky.embed.external` with a thumbnail. For that reason, Threadline currently sticks to clickable links via rich-text facets.

## Recent Posts

- Below the status area there is a `Recent posts` section
- Clicking it opens a list with:
- timestamp
- Bluesky URL
- number of thread posts
- number of attached images
- Individual history entries can be deleted
- The complete history can be cleared in settings
- History is also part of the backup

## Tips

- A random tip is shown below the composer
- There is a button for the next tip
- Tips can be hidden completely
- They can later be re-enabled in settings

## Create A Bluesky App Password

Threadline uses a Bluesky app password, not your main account password.

1. Open Bluesky.
2. Go to `Settings`.
3. Open `Privacy and Security`.
4. Open `App Passwords`.
5. Create a new app password.
6. Copy the generated password and use it in Threadline.

Using a dedicated app password is recommended because you can revoke it later without changing your main login password.

## Run Locally

Threadline is a static app. Any simple local web server is enough.

```powershell
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Install As An App

Threadline is a PWA and can be installed on mobile and desktop devices.

### On Mobile

#### iPhone / iPad (Safari)

1. Open [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/) in Safari.
2. Tap the Share button.
3. Choose `Add to Home Screen`.
4. Confirm with `Add`.

Note: on iOS the installation cannot be triggered automatically. The app includes an install button that shows the required Safari steps.

#### Android (Chrome or Edge)

1. Open [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/) in the browser.
2. Use the install button in the app or the browser menu.
3. Tap `Install app` or `Add to Home screen`.
4. Confirm the installation.

### On Desktop

#### Chrome or Edge

1. Open [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/).
2. Use the install button in the app or the install icon in the browser UI.
3. Confirm the install dialog.

#### What Installation Gives You

- a standalone app window
- a home screen or desktop shortcut
- faster reopening like a normal app
- an offline-ready app shell through the service worker

## Credentials And Storage Notes

- The Bluesky app password is stored locally so the session can be renewed
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
├── version.json
└── icons/
    ├── icon.svg
    └── maskable-icon.svg
```

## Update Detection

Threadline uses a visible app-version check.

- `version.json` contains the public version metadata
- the service worker fetches `version.json` with network priority
- the app checks for updates on startup
- users can manually check for updates in settings

When shipping changes, keep these files in sync:

- `version.json`
- `app.js` (`CURRENT_VERSION_INFO`)
- `sw.js` (`APP_VERSION`) when cached assets or service-worker behavior change

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

## License

- License: [Apache License 2.0](https://marsrakete.github.io/threadline/LICENSE)

## Contact

- Contact: [millux@marsrakete.de](mailto:millux@marsrakete.de)
