# Threadline

[Deutsch](README.de.md) | **English**

<p align="center">
  <img src="icons/icon.svg" alt="Threadline icon" width="140">
</p>

<p align="center">
  A small progressive web app for writing Bluesky posts and turning long text into clean thread segments.
</p>

## Live App

- URL: [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/)

## What It Does

Threadline is a static PWA that connects to Bluesky with an app password, keeps your draft locally, and helps you split long text into post-sized segments for threaded publishing.

## Features

- Bluesky sign-in with app password
- Session handling inside the service worker
- Draft persistence across restarts
- Automatic text splitting when content exceeds 300 characters
- Optional `1/x` counters appended on their own line
- Editable split segments before publishing
- Multilingual UI: German, English, French
- Automatic browser-language detection with manual override
- Built-in update check via `version.json`
- Post-success dialog with direct Bluesky link
- Installable PWA with manifest and service worker

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

Threadline is a PWA and can be installed on phones and desktop systems.

### On Mobile

#### iPhone / iPad (Safari)

1. Open [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/) in Safari.
2. Tap the Share button.
3. Choose `Add to Home Screen`.
4. Confirm with `Add`.

#### Android (Chrome or Edge)

1. Open [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/) in the browser.
2. Open the browser menu.
3. Tap `Install app` or `Add to Home screen`.
4. Confirm the installation.

### On Desktop

#### Chrome or Edge

1. Open [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/).
2. Look for the install icon in the address bar, or open the browser menu.
3. Click `Install Threadline`.
4. Confirm the install dialog.

#### What You Get

- a standalone app window
- a home screen or desktop shortcut
- faster reopening like a normal app
- offline-ready app shell through the service worker

## How Publishing Works

1. Sign in with your Bluesky handle or email and an app password.
2. Enter text in the source field.
3. If the text stays within 300 characters, it can be posted as a single post.
4. If it exceeds 300 characters, Threadline creates editable thread segments.
5. Review the segments and publish them to Bluesky.

## Create A Bluesky App Password

Threadline uses a Bluesky app password, not your main account password.

1. Open Bluesky.
2. Go to `Settings`.
3. Open `Privacy and Security`.
4. Open `App Passwords`.
5. Create a new app password.
6. Copy the generated password and use it in Threadline.

Using a dedicated app password is recommended because you can revoke it later without changing your main login password.

## Language Behavior

- Supported languages: German, English, French
- Default behavior: use browser language
- Fallback: English
- Manual override: available in the settings dialog

## Update Detection

Threadline uses a simple version-check mechanism.

- `version.json` stores the public app version metadata
- the service worker fetches `version.json` with network priority
- the app checks for updates on startup
- users can manually check for updates in settings

When shipping app changes, keep these files in sync:

- `version.json`
- `app.js` (`CURRENT_VERSION_INFO`)
- `sw.js` (`APP_VERSION`) when cached assets or service worker behavior change

## Notes About Credentials

- The Bluesky app password is stored locally for session renewal
- Session and draft data are stored in IndexedDB
- No backend is required for this app

## Recommended Testing

- Use a dedicated Bluesky test account, or
- create a dedicated app password for testing

That lets you verify:

- sign-in flow
- automatic session recovery
- draft persistence
- splitting behavior
- thread publishing
- update detection

## License

- License: [Apache License 2.0](https://marsrakete.github.io/threadline/LICENSE)

## Contact

- Contact: [millux@marsrakete.de](mailto:millux@marsrakete.de)
