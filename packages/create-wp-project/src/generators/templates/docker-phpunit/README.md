# Docker PHPUnit for {{slug}}

Run WordPress plugin unit tests in Docker (PHP + MySQL) without local MySQL.

## Setup

```bash
cd tests/docker-phpunit
cp env.example .env
# Edit .env — set absolute PLUGIN_ROOT, WORDPRESS_DEVELOP_ROOT, DOCKER_PHPUNIT_DIR
chmod +x run-phpunit.sh teardown.sh
```

Clone [wordpress-develop](https://github.com/WordPress/wordpress-develop) if you do not have it, then set `WORDPRESS_DEVELOP_ROOT`.

On the host, once:

```bash
composer install
```

## Run

```bash
./run-phpunit.sh              # full suite
./run-phpunit.sh 'MyTest'     # --filter
```

Or from the plugin root:

```bash
composer test:docker
```

## Tear down

```bash
./teardown.sh
```

Do **not** commit `.env` or generated `wp-tests-config.php`.
