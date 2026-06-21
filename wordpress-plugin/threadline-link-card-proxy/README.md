# Threadline Link Card Proxy

This optional WordPress plugin lets Threadline create Bluesky link cards from URLs in individual thread segments. It runs on your own WordPress installation and fetches the target page metadata for the static Threadline PWA.

## Requirements

- Admin access to your own WordPress installation
- WordPress 6.0 or newer
- PHP 7.4 or newer
- HTTPS for the WordPress site is strongly recommended
- WordPress REST API reachable from the browser
- Outbound HTTP(S) requests from the WordPress server to the URLs you want to preview

The plugin is intended for a WordPress installation you control. A normal author/editor account is not enough because installation and configuration require WordPress admin rights.

## Where To Get It

Use the ZIP package from this repository:

`wordpress-plugin/threadline-link-card-proxy.zip`

When installing from a GitHub release, download the same ZIP asset if it is attached there.

## Installation

1. Open WordPress Admin.
2. Go to `Plugins` -> `Add New` -> `Upload Plugin`.
3. Choose `threadline-link-card-proxy.zip`.
4. Install and activate the plugin.
5. Open the new `Threadline` admin menu.

The plugin page shows the REST endpoint and the shared secret that Threadline needs.

## Connect Threadline

1. In WordPress Admin, open `Threadline`.
2. Copy the proxy endpoint, for example `https://example.com/wp-json/threadline/v1/link-card`.
3. Copy the generated secret.
4. Open Threadline.
5. Go to `Settings` -> `Link cards`.
6. Paste the proxy endpoint and secret.
7. Save the settings.

If you restrict allowed origins in the plugin, add the origin of your Threadline app, for example `https://marsrakete.github.io` or your local development origin such as `http://localhost:5012`.

## Usage In Threadline

When a thread segment contains a URL and the proxy is configured, Threadline enables the link-card action for that segment. The popup asks whether a link card should be created.

Bluesky posts cannot combine image embeds and external link cards in the same post. If the segment already has images, Threadline warns before creating the link card and removing those images from the segment.

Generated link cards are saved with the thread data and survive reloads and thread backups.

## Security And Operations

- Requests are signed with an HMAC secret shared between Threadline and the plugin.
- Optional allowed origins can restrict which browser origins may call the proxy.
- SSRF protection blocks local, private, loopback, and otherwise unsafe targets.
- Rate limits are configurable in the plugin settings.
- The request log keeps the last 30 days and can be downloaded as CSV.
- Old log entries are cleaned automatically by WP-Cron.
- Uninstalling the plugin removes its settings, scheduled cleanup, and database table.
