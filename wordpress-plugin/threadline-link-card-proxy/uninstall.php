<?php
/**
 * Remove Threadline Link Card Proxy data on plugin deletion.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('threadline_link_card_proxy_options');
delete_option('threadline_link_card_proxy_version');
wp_clear_scheduled_hook('threadline_link_card_proxy_cleanup_logs');

global $wpdb;

$wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}threadline_link_card_requests");

$transient_prefixes = [
    '_transient_threadline_lc_nonce_',
    '_transient_timeout_threadline_lc_nonce_',
    '_transient_threadline_lc_rate_',
    '_transient_timeout_threadline_lc_rate_',
];

foreach ($transient_prefixes as $prefix) {
    $like = $wpdb->esc_like($prefix) . '%';
    $wpdb->query($wpdb->prepare(
        "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
        $like
    ));
}
