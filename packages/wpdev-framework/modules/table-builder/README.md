# table-builder

List tables, bulk ajax, screen options, and declarative `Table_Config`.

## Dependencies

core, tab-navigation

## Usage

### List admin page

1. Extend `WPDevFramework\List_Tables\Base_List_Table`.
2. Implement `declarative_table_config()` with `declarative_schema( $column_keys, $extra )`.
3. Optional `empty_state` keys merge into list-page empty UI via `get_empty_state_args()`.
4. Optional `views` array is returned from `get_views()` when the table does not override it. Use `declarative_filter_views( 'status', array( 'all' => __( 'All', 'wpdev' ), … ) )` for status/filter tabs.
5. Optional `bulk_confirm` slugs register modal confirm handlers via `Bulk_Action_Pipeline` + `Modal_Service` (K5-003).
6. Return columns from `get_columns()` via `self::declarative_columns()` or inline labels.
4. Set `$table_class` on your `List_Admin_Page` subclass.

See `examples/example-01.php`.

### Widget on edit page

When the same table class appears on a list page **and** inside a metabox widget:

1. Call `set_context( 'widget' )`.
2. Call `set_ajax_table_id( 'unique_slug' )` before display.
3. Override `user_can_ajax_refresh()` when panel users need scoped access.

See `examples/example-02.php` and `docs/modularization/table-id-audit.md`.

### Ajax JS scoping (K5-005)

Markup wraps each table in `#wpdev-{id}` with `data-table-id="{id}"`.
`list-tables.js` binds pagination, bulk actions, and search within that wrapper so
multiple tables on one screen do not cross-trigger.

## Legacy bridge

`WPDevFramework\List_Tables\Base_List_Table` resolves via `Legacy_Shim_Autoloader` to
`modules/table-builder/src/table/class-base-list-table.php`.
