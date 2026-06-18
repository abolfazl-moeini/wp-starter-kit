# Table Ajax ID Audit (N-003)

Audit of list table widgets embedded in edit/metabox pages. Each widget must call `set_context('widget')` and `set_ajax_table_id( $base_id . '__' . $widget_id )` to avoid ajax registry collisions.

## Pattern (canonical)

```php
$atts['table']->set_context( 'widget' );
$atts['table']->set_ajax_table_id( $atts['table']->get_table_id() . '__' . sanitize_key( $id ) );
```

## Call sites

| Location | Method | Ajax ID pattern | Status |
|----------|--------|-----------------|--------|
| `modules/admin-page-builder/.../class-edit-admin-page.php` | `add_list_table_widget()` | `{table_id}__{widget_id}` | OK |
| `modules/metabox-builder/.../class-post-edit-admin-page.php` | `add_list_table_widget()` | `{table_id}__{widget_id}` | Fixed 2.5.0 |
| `examples/customer-panel/src/tables/*` | page context | `site_list_table__customer_panel`, etc. | OK |
| Customer edit / site edit pages | widget tables | scoped via `Edit_Admin_Page` | OK |

## Customer-panel ajax caps (N-007)

All customer-panel list tables override `user_can_ajax_refresh()` — see `examples/customer-panel/src/tables/`.

## Verification

- PHPUnit: `tests/unit-tests/Performance/ListTableAssetTest.php`
- Smoke: `data-table-id` on list table wrapper in `Base_List_Table`
