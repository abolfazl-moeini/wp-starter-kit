<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature\Rest;

use WPDev\Modules\ExampleFeature\Access\FeatureAccess;
use WPDev\Modules\ExampleFeature\Templates\View;
use WPDev\Support\Auth\CapabilityPolicy;
use WPDev\Support\Rest\AllowBatch;
use WPDev\Support\Rest\BatchResponse;
use WPDev\Support\Rest\RestHandler;
use WP_REST_Request;
use WP_REST_Response;

final class ItemsController extends RestHandler implements AllowBatch
{
    /**
     * Capability gate is declared on FeatureAccess (AccessManager), not here.
     * Prefer named access ids over inline current_user_can() / CapabilityPolicy::can().
     *
     * @see FeatureAccess::EDIT_ITEMS
     */
    public const REQUIRED_CAPABILITY = 'edit_posts';

    public function rest_handler(WP_REST_Request $request): WP_REST_Response
    {
        // sanitize_text_field() strips control characters, null bytes,
        // and normalises whitespace — the input is then safe to reflect
        // into a response payload that flows into JS batch clients
        // (localStorage, IndexedDB keys, log aggregators).
        $cacheKey = sanitize_text_field(
            (string) ($request->get_param('cacheKey') ?? 'default')
        );
        // Template API demo: View::notice() sets vars + loads Templates/status-notice.php.
        // Prefer Template::set_variable / load over extract() + include.
        $noticeHtml = View::notice('Example items loaded', 'success');

        return BatchResponse::wrap(
            [
                'items'  => [['id' => 1, 'label' => 'Example']],
                'notice' => $noticeHtml,
            ],
            $cacheKey
        );
    }

    public function rest_permission(): bool
    {
        // AccessManager: single source of truth for feature access rules.
        // FeatureAccess::describe() maps EDIT_ITEMS → any('edit_posts').
        return CapabilityPolicy::access(
            new FeatureAccess(),
            FeatureAccess::EDIT_ITEMS
        );
    }

    public function rest_end_point(): string
    {
        return 'items';
    }

    public function methods(): string
    {
        return 'POST';
    }

    public function allow_batch(): array
    {
        return ['v1' => true];
    }
}
