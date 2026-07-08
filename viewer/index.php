<?php
declare(strict_types=1);

if (PHP_SAPI === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $file = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $path);
    if ($path !== '/' && is_file($file)) {
        return false;
    }
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function archive_dir(): string
{
    $value = getenv('THREADLINE_ARCHIVE_DIR') ?: '';
    if ($value === '') {
        $value = getcwd() ?: __DIR__;
    }
    $resolved = realpath($value);
    if ($resolved === false || !is_dir($resolved)) {
        json_error('Archive directory not found.', 500);
    }
    return $resolved;
}

function database_path(): string
{
    $value = getenv('THREADLINE_DATABASE_PATH') ?: '';
    if ($value === '') {
        $value = archive_dir() . DIRECTORY_SEPARATOR . 'threadline-archive.sqlite';
    }
    $resolved = realpath($value);
    if ($resolved === false || !is_file($resolved)) {
        json_error('threadline-archive.sqlite not found.', 500);
    }
    return $resolved;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $pdo = new PDO('sqlite:' . database_path(), null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA query_only = ON');
    $pdo->exec('PRAGMA busy_timeout = 3000');
    return $pdo;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400): never
{
    json_response(['ok' => false, 'error' => $message], $status);
}

function int_param(string $name, int $default, int $min, int $max): int
{
    $value = filter_input(INPUT_GET, $name, FILTER_VALIDATE_INT);
    if ($value === false || $value === null) {
        return $default;
    }
    return max($min, min($max, (int)$value));
}

function string_param(string $name): string
{
    return trim((string)($_GET[$name] ?? ''));
}

function decode_json_value(?string $value, mixed $fallback): mixed
{
    if ($value === null || trim($value) === '') {
        return $fallback;
    }
    $decoded = json_decode($value, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $fallback;
}

function archive_manifest(): ?array
{
    static $manifest = false;
    if ($manifest !== false) {
        return $manifest;
    }

    $manifestPath = archive_dir() . DIRECTORY_SEPARATOR . 'manifest.json';
    if (!is_file($manifestPath)) {
        $manifest = null;
        return null;
    }

    $decoded = json_decode((string)file_get_contents($manifestPath), true);
    $manifest = json_last_error() === JSON_ERROR_NONE && is_array($decoded) ? $decoded : null;
    return $manifest;
}

function archive_account_did(): string
{
    $manifest = archive_manifest();
    $did = $manifest['account']['did'] ?? '';
    return is_string($did) ? trim($did) : '';
}

function post_from_row(array $row): array
{
    $counts = decode_json_value($row['counts_json'] ?? null, [
        'likeCount' => 0,
        'replyCount' => 0,
        'repostCount' => 0,
        'quoteCount' => 0,
    ]);

    return [
        'uri' => (string)($row['uri'] ?? ''),
        'cid' => (string)($row['cid'] ?? ''),
        'rkey' => (string)($row['rkey'] ?? ''),
        'createdAt' => (string)($row['created_at'] ?? ''),
        'createdAtUnix' => (int)($row['created_at_unix'] ?? 0),
        'text' => (string)($row['text'] ?? ''),
        'permalink' => (string)($row['permalink'] ?? ''),
        'authorHandle' => (string)($row['author_handle'] ?? ''),
        'authorDisplayName' => (string)($row['author_display_name'] ?? ''),
        'authorDid' => (string)($row['author_did'] ?? ''),
        'authorAvatarPath' => (string)($row['author_avatar_path'] ?? ''),
        'thread' => [
            'rootUri' => (string)($row['thread_root_uri'] ?? ''),
            'parentUri' => (string)($row['thread_parent_uri'] ?? ''),
        ],
        'counts' => is_array($counts) ? $counts : [],
        'images' => decode_json_value($row['images_json'] ?? null, []),
        'externalCard' => decode_json_value($row['external_card_json'] ?? null, null),
        'mediaSkippedCount' => (int)($row['media_skipped_count'] ?? 0),
        'childCount' => (int)($row['child_count'] ?? 0),
        'threadSize' => (int)($row['thread_size'] ?? 1),
    ];
}

function post_select_sql(): string
{
    return "
        p.uri, p.cid, p.rkey, p.created_at, p.created_at_unix, p.text,
        p.counts_json, p.permalink, p.author_handle, p.author_display_name,
        p.author_did, p.author_avatar_path, p.thread_root_uri, p.thread_parent_uri,
        p.images_json, p.external_card_json, p.media_skipped_count
    ";
}

function enrich_thread_items(array $items): array
{
    $childCounts = [];
    foreach ($items as $item) {
        $parentUri = (string)($item['thread']['parentUri'] ?? '');
        if ($parentUri === '') {
            continue;
        }
        $childCounts[$parentUri] = ($childCounts[$parentUri] ?? 0) + 1;
    }

    $threadSize = count($items);
    foreach ($items as $index => $item) {
        $uri = (string)($item['uri'] ?? '');
        $items[$index]['childCount'] = (int)($childCounts[$uri] ?? 0);
        $items[$index]['threadSize'] = $threadSize;
    }
    return $items;
}

function enrich_post_list_items(array $items): array
{
    if (!$items) {
        return [];
    }

    $rootKeys = [];
    $uris = [];
    foreach ($items as $item) {
        $uri = (string)($item['uri'] ?? '');
        $rootUri = (string)($item['thread']['rootUri'] ?? '');
        $rootKey = $rootUri !== '' ? $rootUri : $uri;
        if ($rootKey !== '') {
            $rootKeys[$rootKey] = true;
        }
        if ($uri !== '') {
            $uris[$uri] = true;
        }
    }

    $threadSizes = [];
    $rootList = array_keys($rootKeys);
    if ($rootList) {
        $placeholders = implode(',', array_fill(0, count($rootList), '?'));
        $stmt = db()->prepare("
            SELECT thread_root_uri, COUNT(*) AS reply_count
            FROM posts
            WHERE thread_root_uri IN ($placeholders)
            GROUP BY thread_root_uri
        ");
        $stmt->execute($rootList);
        foreach ($stmt->fetchAll() as $row) {
            $threadSizes[(string)$row['thread_root_uri']] = (int)$row['reply_count'];
        }

        $stmt = db()->prepare("SELECT uri FROM posts WHERE uri IN ($placeholders)");
        $stmt->execute($rootList);
        foreach ($stmt->fetchAll() as $row) {
            $rootKey = (string)$row['uri'];
            $threadSizes[$rootKey] = ($threadSizes[$rootKey] ?? 0) + 1;
        }
    }

    $childCounts = [];
    $uriList = array_keys($uris);
    if ($uriList) {
        $placeholders = implode(',', array_fill(0, count($uriList), '?'));
        $stmt = db()->prepare("
            SELECT thread_parent_uri, COUNT(*) AS child_count
            FROM posts
            WHERE thread_parent_uri IN ($placeholders)
            GROUP BY thread_parent_uri
        ");
        $stmt->execute($uriList);
        foreach ($stmt->fetchAll() as $row) {
            $childCounts[(string)$row['thread_parent_uri']] = (int)$row['child_count'];
        }
    }

    foreach ($items as $index => $item) {
        $uri = (string)($item['uri'] ?? '');
        $rootUri = (string)($item['thread']['rootUri'] ?? '');
        $rootKey = $rootUri !== '' ? $rootUri : $uri;
        $items[$index]['threadSize'] = (int)($threadSizes[$rootKey] ?? 1);
        $items[$index]['childCount'] = (int)($childCounts[$uri] ?? 0);
    }

    return $items;
}

function api_summary(): never
{
    $pdo = db();
    $stats = $pdo->query("
        SELECT
          COUNT(*) AS post_count,
          COUNT(DISTINCT COALESCE(NULLIF(thread_root_uri, ''), uri)) AS thread_count,
          MIN(created_at) AS first_created_at,
          MAX(created_at) AS last_created_at
        FROM posts
    ")->fetch() ?: [];

    $manifest = archive_manifest();

    json_response([
        'ok' => true,
        'archiveDir' => archive_dir(),
        'databasePath' => database_path(),
        'stats' => [
            'postCount' => (int)($stats['post_count'] ?? 0),
            'threadCount' => (int)($stats['thread_count'] ?? 0),
            'firstCreatedAt' => (string)($stats['first_created_at'] ?? ''),
            'lastCreatedAt' => (string)($stats['last_created_at'] ?? ''),
        ],
        'manifest' => $manifest,
    ]);
}

function api_posts(): never
{
    $limit = int_param('limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
    $offset = int_param('offset', 0, 0, PHP_INT_MAX);
    $query = string_param('q');
    $onlyThreads = string_param('onlyThreads') === '1';

    $where = [];
    $params = [];
    if ($query !== '') {
        $where[] = "(p.text LIKE :q OR p.author_handle LIKE :q OR p.author_display_name LIKE :q OR p.uri LIKE :q)";
        $params[':q'] = '%' . $query . '%';
    }
    if ($onlyThreads) {
        $accountDid = archive_account_did();
        if ($accountDid === '') {
            json_error('Archive manifest does not contain an account DID.', 500);
        }
        $where[] = "p.author_did = :accountDid";
        $where[] = "(p.thread_root_uri IS NULL OR p.thread_root_uri = '' OR p.thread_root_uri = p.uri)";
        $where[] = "EXISTS (SELECT 1 FROM posts c WHERE c.thread_root_uri = p.uri AND c.uri <> p.uri)";
        $params[':accountDid'] = $accountDid;
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = 'SELECT ' . post_select_sql() . " FROM posts p $whereSql ORDER BY p.created_at_unix DESC, p.uri DESC LIMIT :limit OFFSET :offset";
    $stmt = db()->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $items = enrich_post_list_items(array_map('post_from_row', $stmt->fetchAll()));

    json_response([
        'ok' => true,
        'items' => $items,
        'limit' => $limit,
        'offset' => $offset,
    ]);
}

function api_post(): never
{
    $uri = string_param('uri');
    if ($uri === '') {
        json_error('Missing uri.');
    }
    $stmt = db()->prepare('SELECT ' . post_select_sql() . ' FROM posts p WHERE p.uri = :uri LIMIT 1');
    $stmt->execute([':uri' => $uri]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Post not found.', 404);
    }
    json_response(['ok' => true, 'post' => post_from_row($row)]);
}

function api_thread(): never
{
    $uri = string_param('uri');
    if ($uri === '') {
        json_error('Missing uri.');
    }

    $stmt = db()->prepare('SELECT uri, thread_root_uri FROM posts WHERE uri = :uri LIMIT 1');
    $stmt->execute([':uri' => $uri]);
    $seed = $stmt->fetch();
    if (!$seed) {
        json_error('Post not found.', 404);
    }
    $rootUri = (string)($seed['thread_root_uri'] ?: $seed['uri']);

    $stmt = db()->prepare('SELECT ' . post_select_sql() . '
        FROM posts p
        WHERE p.uri = :selectedUri OR p.uri = :rootUriA OR p.thread_root_uri = :rootUriB
        ORDER BY p.created_at_unix ASC, p.uri ASC
    ');
    $stmt->execute([
        ':selectedUri' => $uri,
        ':rootUriA' => $rootUri,
        ':rootUriB' => $rootUri,
    ]);
    $items = array_map('post_from_row', $stmt->fetchAll());
    $items = enrich_thread_items($items);

    json_response([
        'ok' => true,
        'rootUri' => $rootUri,
        'selectedUri' => $uri,
        'items' => $items,
    ]);
}

function api_asset(): never
{
    $relative = str_replace('\\', '/', string_param('path'));
    $relative = ltrim($relative, '/');
    if ($relative === '' || str_contains($relative, '..')) {
        json_error('Invalid asset path.');
    }

    $archive = archive_dir();
    $path = realpath($archive . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative));
    if ($path === false || !is_file($path) || !str_starts_with($path, $archive . DIRECTORY_SEPARATOR)) {
        json_error('Asset not found.', 404);
    }

    $mime = asset_mime_type($path);
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=3600');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function asset_mime_type(string $path): string
{
    if (function_exists('mime_content_type')) {
        $detected = mime_content_type($path);
        if (is_string($detected) && $detected !== '') {
            return $detected;
        }
    }

    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    return match ($extension) {
        'avif' => 'image/avif',
        'gif' => 'image/gif',
        'jpg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'svg' => 'image/svg+xml',
        'webp' => 'image/webp',
        default => 'application/octet-stream',
    };
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
try {
    if ($path === '/api/summary') {
        api_summary();
    }
    if ($path === '/api/posts') {
        api_posts();
    }
    if ($path === '/api/post') {
        api_post();
    }
    if ($path === '/api/thread') {
        api_thread();
    }
    if ($path === '/asset') {
        api_asset();
    }
} catch (Throwable $error) {
    json_error($error->getMessage(), 500);
}
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Threadline Viewer</title>
  <link rel="stylesheet" href="/viewer.css">
</head>
<body>
  <div class="app-shell">
    <aside class="post-list-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Threadline Archiv</p>
          <h1>Viewer</h1>
        </div>
        <p id="archive-status" class="status-line">Lade Archiv...</p>
      </header>
      <div class="filters">
        <input id="search-input" type="search" placeholder="Suchen" autocomplete="off">
        <label class="check-row">
          <input id="threads-only-input" type="checkbox">
          <span>Nur eigene Thread-Roots</span>
        </label>
      </div>
      <div id="post-list" class="post-list" aria-live="polite"></div>
      <button id="load-more-button" class="text-button" type="button">Mehr laden</button>
    </aside>

    <main class="viewer-main">
      <section class="map-panel">
        <div class="map-toolbar">
          <div>
            <p class="eyebrow">Threadkarte</p>
            <h2 id="map-title">Kein Thread geladen</h2>
          </div>
          <div class="map-actions">
            <button id="to-root-button" class="wide-button" type="button">To Root</button>
            <button id="collapse-all-button" type="button" title="Alle einklappen">Fold</button>
            <button id="expand-all-button" type="button" title="Alle aufklappen">Open</button>
            <button id="zoom-out-button" type="button" title="Verkleinern">-</button>
            <input id="zoom-input" type="range" min="70" max="140" value="100" title="Zoom">
            <button id="zoom-in-button" type="button" title="Vergroessern">+</button>
          </div>
        </div>
        <div id="thread-map-viewport" class="thread-map-viewport">
          <div id="thread-map" class="thread-map"></div>
        </div>
      </section>
    </main>
  </div>
  <script src="/viewer.js"></script>
</body>
</html>
