<?php
/**
 * Plugin Name: Threadline Link Card Proxy
 * Plugin URI: https://marsrakete.github.io/threadline/
 * Description: Secure OpenGraph/Twitter-card proxy for Threadline.
 * Version: 0.1.12
 * Author: Threadline
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * Text Domain: threadline-link-card-proxy
 * Update URI: https://marsrakete.github.io/threadline/wordpress-plugin/threadline-link-card-proxy.zip
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Threadline_Link_Card_Proxy_Plugin', false)) {
final class Threadline_Link_Card_Proxy_Plugin {
    private const VERSION = '0.1.12';
    private const OPTION_KEY = 'threadline_link_card_proxy_options';
    private const VERSION_OPTION_KEY = 'threadline_link_card_proxy_version';
    private const REST_NAMESPACE = 'threadline/v1';
    private const REST_ROUTE = '/link-card';
    private const CLEANUP_HOOK = 'threadline_link_card_proxy_cleanup_logs';
    private const LOG_RETENTION_DAYS = 30;
    private const MAX_REDIRECTS = 4;
    private const MAX_HTML_BYTES = 524288;
    private const MAX_IMAGE_BYTES = 1000000;
    private const SIGNATURE_TTL = 120;

    public static function init(): void {
        add_action('plugins_loaded', [self::class, 'bootstrap']);
        add_action('admin_menu', [self::class, 'add_admin_page']);
        add_action('admin_head', [self::class, 'print_admin_icon_styles']);
        add_action('admin_init', [self::class, 'ensure_saved_options'], 1);
        add_action('admin_init', [self::class, 'register_settings']);
        add_action('rest_api_init', [self::class, 'register_routes']);
        add_action('admin_post_threadline_regenerate_secret', [self::class, 'regenerate_secret']);
        add_action('admin_post_threadline_download_link_card_log', [self::class, 'download_log']);
        add_action(self::CLEANUP_HOOK, [self::class, 'cleanup_logs']);
        add_filter('rest_allowed_cors_headers', [self::class, 'add_allowed_cors_headers']);
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), [self::class, 'add_plugin_action_links']);
    }

    public static function activate(): void {
        self::ensure_log_table();
        self::cleanup_logs();
        self::ensure_cleanup_schedule();
        self::options(true);
        update_option(self::VERSION_OPTION_KEY, self::VERSION, false);
    }

    public static function deactivate(): void {
        wp_clear_scheduled_hook(self::CLEANUP_HOOK);
    }

    public static function bootstrap(): void {
        if ((string)get_option(self::VERSION_OPTION_KEY, '') !== self::VERSION) {
            self::activate();
            return;
        }
        self::ensure_cleanup_schedule();
    }

    private static function ensure_cleanup_schedule(): void {
        if (!wp_next_scheduled(self::CLEANUP_HOOK)) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', self::CLEANUP_HOOK);
        }
    }

    private static function defaults(): array {
        return [
            'secret' => '',
            'allowed_origins' => '',
            'rate_limit_per_minute' => 20,
            'rate_limit_per_hour' => 200,
            'allowed_ports' => '80,443',
            'observed_origins' => [],
        ];
    }

    public static function ensure_saved_options(): void {
        self::options(true);
    }

    private static function options(bool $persist_secret = false): array {
        $options = get_option(self::OPTION_KEY, []);
        $options = is_array($options) ? $options : [];
        $options = array_merge(self::defaults(), $options);
        if (!$options['secret']) {
            $options['secret'] = self::generate_secret();
            if ($persist_secret) {
                update_option(self::OPTION_KEY, $options, false);
            }
        }
        return $options;
    }

    private static function generate_secret(): string {
        return bin2hex(random_bytes(32));
    }

    private static function log_table_name(): string {
        global $wpdb;
        return $wpdb->prefix . 'threadline_link_card_requests';
    }

    private static function ensure_log_table(): void {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::log_table_name();
        $charset_collate = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE {$table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            requested_at datetime NOT NULL,
            remote_addr varchar(100) NOT NULL DEFAULT '',
            origin varchar(255) NOT NULL DEFAULT '',
            target_url text NOT NULL,
            final_url text NOT NULL,
            result varchar(20) NOT NULL DEFAULT '',
            http_status smallint(5) unsigned NOT NULL DEFAULT 0,
            error_code varchar(100) NOT NULL DEFAULT '',
            title text NOT NULL,
            duration_ms int(10) unsigned NOT NULL DEFAULT 0,
            PRIMARY KEY  (id),
            KEY requested_at (requested_at),
            KEY result (result)
        ) {$charset_collate};");
    }

    private static function admin_icon_url(): string {
        return plugins_url('assets/icon.svg', __FILE__);
    }

    public static function add_admin_page(): void {
        add_menu_page(
            'Threadline Link Cards',
            'Threadline',
            'manage_options',
            'threadline-link-card-proxy',
            [self::class, 'render_admin_page'],
            self::admin_icon_url(),
            81
        );
    }

    public static function print_admin_icon_styles(): void {
        ?>
        <style>
          #toplevel_page_threadline-link-card-proxy .wp-menu-image img {
            width: 18px;
            height: 18px;
            padding-top: 7px;
            opacity: 0.9;
          }
        </style>
        <?php
    }

    public static function add_plugin_action_links(array $links): array {
        $settings_url = admin_url('admin.php?page=threadline-link-card-proxy');
        array_unshift($links, sprintf(
            '<a href="%s">%s</a>',
            esc_url($settings_url),
            esc_html__('Settings', 'threadline-link-card-proxy')
        ));
        return $links;
    }

    public static function register_settings(): void {
        register_setting('threadline_link_card_proxy', self::OPTION_KEY, [
            'type' => 'array',
            'sanitize_callback' => [self::class, 'sanitize_options'],
            'default' => self::defaults(),
        ]);
    }

    public static function sanitize_options($value): array {
        $current = self::options();
        $value = is_array($value) ? $value : [];
        return [
            'secret' => preg_match('/^[a-f0-9]{64}$/i', (string)($value['secret'] ?? ''))
                ? strtolower((string)$value['secret'])
                : $current['secret'],
            'allowed_origins' => sanitize_textarea_field((string)($value['allowed_origins'] ?? '')),
            'rate_limit_per_minute' => max(1, min(600, (int)($value['rate_limit_per_minute'] ?? 20))),
            'rate_limit_per_hour' => max(1, min(10000, (int)($value['rate_limit_per_hour'] ?? 200))),
            'allowed_ports' => sanitize_text_field((string)($value['allowed_ports'] ?? '80,443')),
            'observed_origins' => self::sanitize_observed_origins($current['observed_origins'] ?? []),
        ];
    }

    public static function regenerate_secret(): void {
        if (!current_user_can('manage_options')) {
            wp_die('Forbidden', 403);
        }
        check_admin_referer('threadline_regenerate_secret');
        $options = self::options(true);
        $options['secret'] = self::generate_secret();
        update_option(self::OPTION_KEY, $options, false);
        wp_safe_redirect(admin_url('admin.php?page=threadline-link-card-proxy&secret-regenerated=1'));
        exit;
    }

    public static function render_admin_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }
        $active_tab = sanitize_key((string)($_GET['tab'] ?? 'settings'));
        if (!in_array($active_tab, ['settings', 'log'], true)) {
            $active_tab = 'settings';
        }
        try {
            $options = self::options(true);
            $endpoint = esc_url_raw(rest_url(self::REST_NAMESPACE . self::REST_ROUTE));
        } catch (Throwable $exception) {
            ?>
            <div class="wrap">
                <h1>Threadline Link Card Proxy</h1>
                <div class="notice notice-error"><p><?php echo esc_html($exception->getMessage()); ?></p></div>
            </div>
            <?php
            return;
        }
        ?>
        <div class="wrap">
            <h1>Threadline Link Card Proxy</h1>
            <h2 class="nav-tab-wrapper">
                <a class="nav-tab <?php echo $active_tab === 'settings' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url(admin_url('admin.php?page=threadline-link-card-proxy')); ?>">Einstellungen</a>
                <a class="nav-tab <?php echo $active_tab === 'log' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url(admin_url('admin.php?page=threadline-link-card-proxy&tab=log')); ?>">Protokoll</a>
            </h2>
            <?php if (isset($_GET['secret-regenerated'])) : ?>
                <div class="notice notice-success"><p>Secret neu erzeugt.</p></div>
            <?php endif; ?>
            <?php if ($active_tab === 'log') : ?>
                <?php self::render_log_tab(); ?>
            <?php else : ?>
            <p>Diese Werte in Threadline unter Einstellungen eintragen.</p>
            <table class="widefat striped" style="max-width: 920px;">
                <tbody>
                    <tr><th scope="row">Proxy-Endpunkt</th><td><code><?php echo esc_html($endpoint); ?></code></td></tr>
                    <tr><th scope="row">Secret</th><td><code><?php echo esc_html($options['secret']); ?></code></td></tr>
                </tbody>
            </table>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-top: 12px;">
                <?php wp_nonce_field('threadline_regenerate_secret'); ?>
                <input type="hidden" name="action" value="threadline_regenerate_secret">
                <?php submit_button('Secret neu erzeugen', 'secondary', 'submit', false); ?>
            </form>
            <form method="post" action="options.php" style="margin-top: 24px; max-width: 920px;">
                <?php settings_fields('threadline_link_card_proxy'); ?>
                <input type="hidden" name="<?php echo esc_attr(self::OPTION_KEY); ?>[secret]" value="<?php echo esc_attr($options['secret']); ?>">
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="threadline_allowed_origins">Erlaubte Origins</label></th>
                        <td>
                            <textarea id="threadline_allowed_origins" name="<?php echo esc_attr(self::OPTION_KEY); ?>[allowed_origins]" rows="4" class="large-text" placeholder="https://marsrakete.github.io"><?php echo esc_textarea($options['allowed_origins']); ?></textarea>
                            <?php $observed_origins = self::sanitize_observed_origins($options['observed_origins'] ?? []); ?>
                            <?php if ($observed_origins) : ?>
                                <p class="description"><strong>Zuletzt gesehene Origins:</strong></p>
                                <textarea class="large-text code" rows="<?php echo esc_attr((string)min(5, count($observed_origins))); ?>" readonly><?php echo esc_textarea(implode("\n", $observed_origins)); ?></textarea>
                                <p class="description">Bei aktivierter Allowlist die passenden Origins von hier oben eintragen, zum Beispiel deine lokale PWA-Origin.</p>
                            <?php endif; ?>
                            <p class="description">Eine Origin pro Zeile. Leer erlaubt alle Origins, ist aber nur für lokale Tests empfohlen.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="threadline_rate_minute">Rate-Limit pro Minute</label></th>
                        <td><input id="threadline_rate_minute" type="number" min="1" max="600" name="<?php echo esc_attr(self::OPTION_KEY); ?>[rate_limit_per_minute]" value="<?php echo esc_attr((string)$options['rate_limit_per_minute']); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="threadline_rate_hour">Rate-Limit pro Stunde</label></th>
                        <td><input id="threadline_rate_hour" type="number" min="1" max="10000" name="<?php echo esc_attr(self::OPTION_KEY); ?>[rate_limit_per_hour]" value="<?php echo esc_attr((string)$options['rate_limit_per_hour']); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="threadline_ports">Erlaubte Ports</label></th>
                        <td><input id="threadline_ports" type="text" class="regular-text" name="<?php echo esc_attr(self::OPTION_KEY); ?>[allowed_ports]" value="<?php echo esc_attr($options['allowed_ports']); ?>"><p class="description">Standard: 80,443</p></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <?php endif; ?>
        </div>
        <?php
    }

    private static function get_recent_logs(int $limit = 200): array {
        global $wpdb;
        $table = self::log_table_name();
        self::cleanup_logs();
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE requested_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d DAY) ORDER BY requested_at DESC LIMIT %d",
            self::LOG_RETENTION_DAYS,
            max(1, min(1000, $limit))
        ), ARRAY_A) ?: [];
    }

    private static function render_log_tab(): void {
        $logs = self::get_recent_logs();
        $download_url = wp_nonce_url(
            admin_url('admin-post.php?action=threadline_download_link_card_log'),
            'threadline_download_link_card_log'
        );
        ?>
        <p>Das Protokoll enthält Anfragen der letzten <?php echo esc_html((string)self::LOG_RETENTION_DAYS); ?> Tage. Ältere Einträge werden täglich automatisch gelöscht.</p>
        <p><a class="button button-primary" href="<?php echo esc_url($download_url); ?>">Protokoll als CSV herunterladen</a></p>
        <table class="widefat striped">
            <thead>
                <tr>
                    <th>Zeitpunkt</th>
                    <th>Ergebnis</th>
                    <th>Status</th>
                    <th>Ziel-URL</th>
                    <th>Finale URL</th>
                    <th>Origin</th>
                    <th>IP</th>
                    <th>Dauer</th>
                    <th>Fehler</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$logs) : ?>
                    <tr><td colspan="9">Noch keine Anfragen protokolliert.</td></tr>
                <?php else : ?>
                    <?php foreach ($logs as $entry) : ?>
                        <tr>
                            <td><?php echo esc_html((string)$entry['requested_at']); ?></td>
                            <td><?php echo esc_html((string)$entry['result']); ?></td>
                            <td><?php echo esc_html((string)$entry['http_status']); ?></td>
                            <td><code><?php echo esc_html((string)$entry['target_url']); ?></code></td>
                            <td><code><?php echo esc_html((string)$entry['final_url']); ?></code></td>
                            <td><?php echo esc_html((string)$entry['origin']); ?></td>
                            <td><?php echo esc_html((string)$entry['remote_addr']); ?></td>
                            <td><?php echo esc_html((string)$entry['duration_ms']); ?> ms</td>
                            <td><?php echo esc_html((string)$entry['error_code']); ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        <?php
    }

    public static function download_log(): void {
        if (!current_user_can('manage_options')) {
            wp_die('Forbidden', 403);
        }
        check_admin_referer('threadline_download_link_card_log');
        $logs = self::get_recent_logs(10000);
        nocache_headers();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="threadline-link-card-log-' . gmdate('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['requested_at', 'result', 'http_status', 'target_url', 'final_url', 'origin', 'remote_addr', 'duration_ms', 'error_code', 'title']);
        foreach ($logs as $entry) {
            fputcsv($out, [
                $entry['requested_at'],
                $entry['result'],
                $entry['http_status'],
                $entry['target_url'],
                $entry['final_url'],
                $entry['origin'],
                $entry['remote_addr'],
                $entry['duration_ms'],
                $entry['error_code'],
                $entry['title'],
            ]);
        }
        fclose($out);
        exit;
    }

    public static function register_routes(): void {
        register_rest_route(self::REST_NAMESPACE, self::REST_ROUTE, [
            'methods' => ['POST', 'OPTIONS'],
            'callback' => [self::class, 'handle_request'],
            'permission_callback' => '__return_true',
        ]);
    }

    private static function allowed_origins(): array {
        $lines = preg_split('/\R+/', (string)self::options()['allowed_origins']);
        return self::sanitize_observed_origins($lines ?: []);
    }

    private static function normalize_origin(string $origin): string {
        $parts = wp_parse_url(trim($origin));
        if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
            return '';
        }
        $scheme = strtolower((string)$parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return '';
        }
        $host = strtolower((string)$parts['host']);
        $port = isset($parts['port']) ? ':' . (int)$parts['port'] : '';
        return $scheme . '://' . $host . $port;
    }

    private static function sanitize_observed_origins($origins): array {
        $origins = is_array($origins) ? $origins : [];
        $normalized = [];
        foreach ($origins as $origin) {
            $origin = self::normalize_origin((string)$origin);
            if ($origin) {
                $normalized[] = $origin;
            }
        }
        return array_slice(array_values(array_unique($normalized)), 0, 20);
    }

    private static function remember_origin(?string $origin): void {
        $origin = self::normalize_origin((string)$origin);
        if (!$origin) {
            return;
        }
        $options = self::options(true);
        $observed = self::sanitize_observed_origins($options['observed_origins'] ?? []);
        $observed = array_values(array_filter($observed, static fn($entry) => $entry !== $origin));
        array_unshift($observed, $origin);
        $options['observed_origins'] = array_slice($observed, 0, 20);
        update_option(self::OPTION_KEY, $options, false);
    }

    private static function starts_with(string $value, string $prefix): bool {
        return substr($value, 0, strlen($prefix)) === $prefix;
    }

    private static function ends_with(string $value, string $suffix): bool {
        return $suffix === '' || substr($value, -strlen($suffix)) === $suffix;
    }

    private static function contains(string $value, string $needle): bool {
        return $needle === '' || strpos($value, $needle) !== false;
    }

    private static function absolute_url(string $url, string $base): string {
        if (preg_match('/^https?:\/\//i', $url)) {
            return $url;
        }
        $base_parts = wp_parse_url($base);
        if (!$base_parts || empty($base_parts['scheme']) || empty($base_parts['host'])) {
            return $url;
        }
        if (self::starts_with($url, '//')) {
            return $base_parts['scheme'] . ':' . $url;
        }
        $origin = $base_parts['scheme'] . '://' . $base_parts['host'] . (isset($base_parts['port']) ? ':' . $base_parts['port'] : '');
        if (self::starts_with($url, '/')) {
            return $origin . $url;
        }
        $path = $base_parts['path'] ?? '/';
        $directory = preg_replace('#/[^/]*$#', '/', $path);
        return $origin . $directory . $url;
    }

    private static function add_cors_headers(?string $origin): void {
        $allowed = self::allowed_origins();
        if ($origin && (!$allowed || in_array($origin, $allowed, true))) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin', false);
        }
        header('Access-Control-Allow-Headers: Content-Type, X-Threadline-Timestamp, X-Threadline-Nonce, X-Threadline-Signature, x-threadline-timestamp, x-threadline-nonce, x-threadline-signature');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
    }

    public static function add_allowed_cors_headers(array $headers): array {
        return array_values(array_unique(array_merge($headers, [
            'X-Threadline-Timestamp',
            'X-Threadline-Nonce',
            'X-Threadline-Signature',
            'x-threadline-timestamp',
            'x-threadline-nonce',
            'x-threadline-signature',
        ])));
    }

    private static function verify_origin(WP_REST_Request $request) {
        $origin = $request->get_header('origin');
        self::remember_origin($origin ?: null);
        self::add_cors_headers($origin ?: null);
        $allowed = self::allowed_origins();
        if ($origin && $allowed && !in_array($origin, $allowed, true)) {
            return new WP_Error('threadline_origin_forbidden', 'Origin is not allowed.', ['status' => 403]);
        }
        return true;
    }

    private static function verify_signature(WP_REST_Request $request, string $url) {
        $options = self::options(true);
        $timestamp = (string)$request->get_header('x-threadline-timestamp');
        $nonce = (string)$request->get_header('x-threadline-nonce');
        $signature = strtolower((string)$request->get_header('x-threadline-signature'));
        if (!ctype_digit($timestamp) || abs(time() - (int)$timestamp) > self::SIGNATURE_TTL || !$nonce || !$signature) {
            return new WP_Error('threadline_signature_missing', 'Missing or expired signature.', ['status' => 401]);
        }
        if (get_transient('threadline_lc_nonce_' . md5($nonce))) {
            return new WP_Error('threadline_replay', 'Nonce already used.', ['status' => 409]);
        }
        $payload = $url . "\n" . $timestamp . "\n" . $nonce;
        $expected = hash_hmac('sha256', $payload, $options['secret']);
        if (!hash_equals($expected, $signature)) {
            return new WP_Error('threadline_signature_invalid', 'Invalid signature.', ['status' => 401]);
        }
        set_transient('threadline_lc_nonce_' . md5($nonce), 1, self::SIGNATURE_TTL + 60);
        return true;
    }

    private static function check_rate_limit(): bool {
        $options = self::options();
        $ip = sanitize_key($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        return self::bump_rate('min_' . $ip, 60, (int)$options['rate_limit_per_minute'])
            && self::bump_rate('hour_' . $ip, HOUR_IN_SECONDS, (int)$options['rate_limit_per_hour']);
    }

    private static function bump_rate(string $key, int $ttl, int $limit): bool {
        $transient_key = 'threadline_lc_rate_' . md5($key);
        $count = (int)get_transient($transient_key);
        if ($count >= $limit) {
            return false;
        }
        set_transient($transient_key, $count + 1, $ttl);
        return true;
    }

    public static function cleanup_logs(): void {
        global $wpdb;
        $table = self::log_table_name();
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$table} WHERE requested_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL %d DAY)",
            self::LOG_RETENTION_DAYS
        ));
    }

    private static function log_request(WP_REST_Request $request, $response, float $started_at, string $url = '', string $final_url = '', string $title = ''): void {
        global $wpdb;
        $status = 200;
        $result = 'success';
        $error_code = '';
        if (is_wp_error($response)) {
            $result = 'error';
            $error_code = $response->get_error_code();
            $data = $response->get_error_data($error_code);
            $status = is_array($data) && isset($data['status']) ? (int)$data['status'] : 500;
        } elseif ($response instanceof WP_REST_Response) {
            $status = (int)$response->get_status();
            $result = $status >= 400 ? 'error' : 'success';
        }
        $wpdb->insert(self::log_table_name(), [
            'requested_at' => gmdate('Y-m-d H:i:s'),
            'remote_addr' => sanitize_text_field((string)($_SERVER['REMOTE_ADDR'] ?? '')),
            'origin' => sanitize_text_field((string)$request->get_header('origin')),
            'target_url' => esc_url_raw($url),
            'final_url' => esc_url_raw($final_url),
            'result' => $result,
            'http_status' => $status,
            'error_code' => sanitize_key($error_code),
            'title' => wp_strip_all_tags($title),
            'duration_ms' => max(0, (int)round((microtime(true) - $started_at) * 1000)),
        ], ['%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s', '%d']);
    }

    private static function finish_request(WP_REST_Request $request, $response, float $started_at, string $url = '', string $final_url = '', string $title = '') {
        self::log_request($request, $response, $started_at, $url, $final_url, $title);
        return $response;
    }

    private static function validate_url(string $url) {
        $parts = wp_parse_url($url);
        if (!$parts || !in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true) || empty($parts['host'])) {
            return new WP_Error('threadline_url_invalid', 'Only HTTP and HTTPS URLs are allowed.', ['status' => 400]);
        }
        $host = strtolower($parts['host']);
        if ($host === 'localhost' || self::ends_with($host, '.local')) {
            return new WP_Error('threadline_url_blocked', 'Local hosts are blocked.', ['status' => 400]);
        }
        $port = (int)($parts['port'] ?? (strtolower($parts['scheme']) === 'https' ? 443 : 80));
        $allowed_ports = array_map('intval', preg_split('/\s*,\s*/', self::options()['allowed_ports']));
        if (!in_array($port, $allowed_ports, true)) {
            return new WP_Error('threadline_port_blocked', 'This URL port is not allowed.', ['status' => 400]);
        }
        $records = @dns_get_record($host, DNS_A + DNS_AAAA);
        if (!$records) {
            return new WP_Error('threadline_dns_failed', 'Host could not be resolved.', ['status' => 400]);
        }
        foreach ($records as $record) {
            $ip = $record['ip'] ?? $record['ipv6'] ?? '';
            if ($ip && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return new WP_Error('threadline_ip_blocked', 'Private and reserved IP ranges are blocked.', ['status' => 400]);
            }
        }
        return true;
    }

    private static function fetch_with_redirects(string $url) {
        $current = $url;
        for ($i = 0; $i <= self::MAX_REDIRECTS; $i++) {
            $valid = self::validate_url($current);
            if (is_wp_error($valid)) {
                return $valid;
            }
            $response = wp_remote_get($current, [
                'timeout' => 8,
                'redirection' => 0,
                'limit_response_size' => self::MAX_HTML_BYTES,
                'headers' => ['Accept' => 'text/html,application/xhtml+xml'],
            ]);
            if (is_wp_error($response)) {
                return $response;
            }
            $code = (int)wp_remote_retrieve_response_code($response);
            if (in_array($code, [301, 302, 303, 307, 308], true)) {
                $location = wp_remote_retrieve_header($response, 'location');
                if (!$location) {
                    return new WP_Error('threadline_redirect_invalid', 'Redirect without location.', ['status' => 400]);
                }
                $current = esc_url_raw(self::absolute_url($location, $current));
                continue;
            }
            if ($code < 200 || $code >= 300) {
                return new WP_Error('threadline_fetch_failed', 'Target URL could not be loaded.', ['status' => 502]);
            }
            return [$current, $response];
        }
        return new WP_Error('threadline_redirect_limit', 'Too many redirects.', ['status' => 400]);
    }

    private static function meta_value(DOMXPath $xpath, array $names): string {
        foreach ($names as $name) {
            $query = sprintf('//meta[translate(@property,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="%1$s" or translate(@name,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="%1$s"]/@content', strtolower($name));
            $nodes = $xpath->query($query);
            if ($nodes && $nodes->length > 0) {
                $value = trim((string)$nodes->item(0)->nodeValue);
                if ($value !== '') {
                    return wp_strip_all_tags(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                }
            }
        }
        return '';
    }

    private static function absolutize_url(string $url, string $base): string {
        if (!$url) {
            return '';
        }
        return esc_url_raw(self::absolute_url($url, $base));
    }

    private static function fetch_image_data(string $url): array {
        $valid = self::validate_url($url);
        if (is_wp_error($valid)) {
            return [];
        }
        $response = wp_remote_get($url, [
            'timeout' => 8,
            'redirection' => 0,
            'limit_response_size' => self::MAX_IMAGE_BYTES,
            'headers' => ['Accept' => 'image/*'],
        ]);
        if (is_wp_error($response) || (int)wp_remote_retrieve_response_code($response) >= 300) {
            return [];
        }
        $body = wp_remote_retrieve_body($response);
        $type = wp_remote_retrieve_header($response, 'content-type') ?: 'image/jpeg';
        if (!$body || !self::starts_with(strtolower($type), 'image/')) {
            return [];
        }
        if (strlen($body) > self::MAX_IMAGE_BYTES) {
            $normalized = self::normalize_image_bytes($body, $type);
            if ($normalized) {
                return $normalized;
            }
            return [];
        }
        return [
            'mimeType' => sanitize_mime_type(strtok($type, ';') ?: 'image/jpeg'),
            'bytesBase64' => base64_encode($body),
        ];
    }

    private static function normalize_image_bytes(string $body, string $type): array {
        if (!function_exists('wp_get_image_editor')) {
            return [];
        }
        $tmp = wp_tempnam('threadline-link-card-image');
        if (!$tmp) {
            return [];
        }
        file_put_contents($tmp, $body);
        $editor = wp_get_image_editor($tmp);
        if (is_wp_error($editor)) {
            @unlink($tmp);
            return [];
        }
        $editor->resize(1200, 630, false);
        $saved = $editor->save(null, 'image/jpeg');
        @unlink($tmp);
        if (is_wp_error($saved) || empty($saved['path']) || !is_readable($saved['path'])) {
            return [];
        }
        $bytes = file_get_contents($saved['path']);
        @unlink($saved['path']);
        if (!$bytes || strlen($bytes) > self::MAX_IMAGE_BYTES) {
            return [];
        }
        return [
            'mimeType' => 'image/jpeg',
            'bytesBase64' => base64_encode($bytes),
        ];
    }

    public static function handle_request(WP_REST_Request $request) {
        $started_at = microtime(true);
        $url = trim((string)$request->get_param('url'));
        $origin_check = self::verify_origin($request);
        if (is_wp_error($origin_check)) {
            return self::finish_request($request, $origin_check, $started_at, $url);
        }
        if ($request->get_method() === 'OPTIONS') {
            return rest_ensure_response(['ok' => true]);
        }
        if (!self::check_rate_limit()) {
            $error = new WP_Error('threadline_rate_limited', 'Rate limit exceeded.', ['status' => 429]);
            return self::finish_request($request, $error, $started_at, $url);
        }
        $signature_check = self::verify_signature($request, $url);
        if (is_wp_error($signature_check)) {
            return self::finish_request($request, $signature_check, $started_at, $url);
        }
        $fetched = self::fetch_with_redirects($url);
        if (is_wp_error($fetched)) {
            return self::finish_request($request, $fetched, $started_at, $url);
        }
        [$final_url, $response] = $fetched;
        $content_type = strtolower((string)wp_remote_retrieve_header($response, 'content-type'));
        if ($content_type && !self::contains($content_type, 'html') && !self::contains($content_type, 'xml')) {
            $error = new WP_Error('threadline_not_html', 'Target is not an HTML page.', ['status' => 400]);
            return self::finish_request($request, $error, $started_at, $url, $final_url);
        }
        $html = wp_remote_retrieve_body($response);
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
        $xpath = new DOMXPath($dom);
        $title = self::meta_value($xpath, ['og:title', 'twitter:title']);
        if (!$title) {
            $title_nodes = $xpath->query('//title');
            $title = $title_nodes && $title_nodes->length ? trim((string)$title_nodes->item(0)->textContent) : '';
        }
        $description = self::meta_value($xpath, ['og:description', 'twitter:description', 'description']);
        $card_url = self::meta_value($xpath, ['og:url']) ?: $final_url;
        $image_url = self::absolutize_url(self::meta_value($xpath, ['og:image:secure_url', 'og:image', 'twitter:image']), $final_url);
        $image = $image_url ? self::fetch_image_data($image_url) : [];
        $rest_response = rest_ensure_response([
            'url' => esc_url_raw($card_url),
            'finalUrl' => esc_url_raw($final_url),
            'title' => wp_trim_words(wp_strip_all_tags($title ?: $card_url), 24, ''),
            'description' => wp_trim_words(wp_strip_all_tags($description), 48, ''),
            'imageUrl' => esc_url_raw($image_url),
            'image' => $image,
        ]);
        return self::finish_request($request, $rest_response, $started_at, $url, $final_url, $title ?: $card_url);
    }
}

register_activation_hook(__FILE__, ['Threadline_Link_Card_Proxy_Plugin', 'activate']);
register_deactivation_hook(__FILE__, ['Threadline_Link_Card_Proxy_Plugin', 'deactivate']);
Threadline_Link_Card_Proxy_Plugin::init();
}
