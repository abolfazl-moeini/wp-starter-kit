# Model + Database + Manager skeleton

Full domain module behind admin pages. Reference: `@examples/products/src/`.

## Layer responsibilities

| Layer | Class | Purpose |
|-------|-------|---------|
| DB table | `{Entities}_Table extends Table` | Schema, upgrades |
| Query | `{Entity}_Query extends Query` | Filtering, collections |
| Model | `{Entity} extends Base_Model` | Domain behavior |
| Manager | `{Entity}_Manager extends Base_Manager` | REST, CLI, hooks |

## DB table class

Path: `@examples/{slug}/src/Database/{entity_plural}/class-{entity_plural}-table.php`

```php
namespace WPDevFramework\Database\Products;

use WPDevFramework\Database\Engine\Table;

final class Products_Table extends Table {
    protected $name = 'products';
    protected $global = true;
    protected $version = '2.0.1-revision.20230601';

    protected function set_schema() {
        $this->schema = "id bigint(20) NOT NULL AUTO_INCREMENT, ... PRIMARY KEY (id)";
    }
}
```

Register:

```php
wpdev_register_table( 'product_table', \WPDevFramework\Database\Products\Products_Table::class );
```

## Query class

Path: `@examples/{slug}/src/Database/{entity_plural}/class-{entity}-query.php`

```php
namespace WPDevFramework\Database\Products;

use WPDevFramework\Database\Engine\Query;

class Product_Query extends Query {
    protected $table_name = 'products';
    protected $table_alias = 'p';
    protected $table_schema = '\\WPDevFramework\\Database\\Products\\Products_Schema';
    protected $item_name = 'product';
    protected $item_name_plural = 'products';
    protected $item_shape = '\\WPDevFramework\\Models\\Product';
}
```

## Model class

Path: `@examples/{slug}/src/Models/class-{entity}.php`

```php
namespace WPDevFramework\Models;

class Product extends Base_Model {
    // domain fields and helpers
}
```

## Manager class

Path: `@examples/{slug}/src/managers/class-{entity}-manager.php`

```php
namespace WPDevFramework\Managers;

use WPDevFramework\Managers\Base_Manager;

class Product_Manager extends Base_Manager {
    use \WPDevFramework\Traits\Singleton;

    protected $slug = 'product';
    protected $model_class = '\\WPDevFramework\\Models\\Product';

    public function init() {
        // hooks, REST, CLI
    }
}
```

Boot:

```php
wpdev_boot_module_manager(
    'wpdev-products',
    \WPDevFramework\Managers\Product_Manager::class,
    __DIR__ . '/src/managers/class-product-manager.php'
);
```

## Data flow

1. `setup.php` registers DB tables + pages + manager
2. List page → list table → query → models
3. Edit page → `get_object()` → single model
4. Manager handles integrations

## Common mistakes

1. List table without DB table registration
2. Query `item_shape` mismatch with model class
3. Manager not booted in `setup.php`
4. Business logic in page classes instead of model/manager

See [anti-patterns.md](anti-patterns.md).