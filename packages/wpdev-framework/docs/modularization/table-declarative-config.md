# List table declarative config (2.5.0)

High-traffic list tables use `declarative_table_config()` on `WPDevFramework\List_Tables\Base_List_Table` (table-builder module). Config is stored in `List_Table_Registry` as `Table_Config`.

## Keys

| Key | Purpose |
|-----|---------|
| `columns` | Column slugs for registry / `declarative_columns()` |
| `views` | Filter tabs; use `declarative_filter_views( $field, $tabs )` |
| `empty_state` | Overrides merged in `get_empty_state_args()` on empty list pages |
| `bulk_confirm` | Bulk slugs registered with `Bulk_Action_Pipeline` + `Modal_Service` |
| `actions` | Row-action metadata: `column` + `items` slugs (`edit`, `duplicate`, `delete`). Pilot: products use `build_standard_row_actions()` |

## Patterns

### List admin page

```php
public static function declarative_table_config() {
	return self::declarative_schema(
		array( 'cb', 'name', 'id' ),
		array(
			'views'        => self::declarative_filter_views( 'status', array(
				'all'    => __( 'All Items', 'wpdev' ),
				'active' => __( 'Active', 'wpdev' ),
			) ),
			'empty_state'  => array( 'sub_message' => __( '…', 'wpdev' ) ),
			'bulk_confirm' => array( 'delete' ),
		)
	);
}
```

Remove overridden `get_views()` when `views` is in config.

### Row actions

Use `standard_row_actions_for( $item, $model, $edit_page_slug, $defaults )` for `edit` / `duplicate` / `delete`. Merge custom slugs (e.g. webhook `test`, checkout `get_shortcode`) after the helper returns.

`duplicate` resolves via `row_action_duplicate()` for products and checkout forms.

### Widget / customer-panel table

When extending a parent list table, **override** `declarative_table_config()` so the registry does not inherit parent `views` / `bulk_confirm` under the widget `ajax_table_id`.

```php
$this->set_ajax_table_id( 'site_list_table__customer_panel' );

public static function declarative_table_config() {
	return self::declarative_schema(
		array(),
		array(
			'views' => self::declarative_filter_views( 'type', array(
				'all' => __( 'Your Sites', 'wpdev' ),
			) ),
		)
	);
}
```

## References

- `modules/table-builder/README.md`
- `modules/table-builder/examples/example-01.php`, `example-02.php`
- `docs/modularization/table-id-audit.md`
