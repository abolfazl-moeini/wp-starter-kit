# WPDev Framework — Release Preparation Plan

> Last updated: 2026-06-05  
> Plugin version target: see `constants.php` / `readme.txt` / `wpdev.php`  
> Repository root: this plugin folder (`wpdev/`)

> [!IMPORTANT]
> **توجه برای توسعه‌دهندگان (نسخه 2.8.1+):**  
> ابزارهای محلی بیلد، تست و لینت (`composer.json`، اسکریپت‌های `bin/` و تست‌های `tests/`) از این ریپازیتوری حذف شده‌اند. دستورات `composer ci`، `composer test`، `composer release:gate` و غیره که در زیر آمده‌اند، جنبه تاریخی دارند و در این ریپازیتوری مستقیماً قابل اجرا نیستند. برای اعتبارسنجی تغییرات، تست‌های دستی (Smoke Testing) را در یک محیط لوکال وردپرس مولتی‌سایت که هر سه پلاگین فریم‌ورک، نمونه‌ها و پلی‌گراند در آن فعال هستند انجام دهید.

## 1. هدف

آماده‌سازی انتشار WPDev Framework به‌عنوان یک پلاگین ماژولار WordPress با:

- **Framework اجباری** در `modules/`
- **نمونه‌های اختیاری** در `examples/`
- **مستندات جدا** در `docs/`
- بدون runtime PHP در `inc/`

## 2. ساختار پوشه‌ها (وضعیت هدف)

| پوشه | نقش | در zip انتشار |
|------|-----|----------------|
| `modules/` | هسته فریم‌ورک | بله |
| `examples/` | دموهای WaaS (اختیاری) | بله (یا zip جدا framework-only) |
| `docs/` | مستندات | اختیاری (GitHub / docs site) |
| `docs/site/` | سایت استاتیک مستندات | اختیاری |
| `assets/`, `views/`, `lang/`, `data/`, `dependencies/` | runtime پلاگین | بله |
| `bin/`, `tests/`, `vendor/`, `skills/`, `.github/` | توسعه و CI | خیر |
| `inc/` | legacy خالی | بله (README فقط) |

جزئیات: [`STRUCTURE.md`](STRUCTURE.md)

## 3. فاز A — مرتب‌سازی (انجام‌شده / تأیید)

- [x] `examples/` برای دامنه‌ها و playground
- [x] `modules/` فقط برای framework
- [x] `docs/` برای همه مستندات (api، framework، modularization)
- [x] انتقال `docs-site/` → `docs/site/`
- [x] حذف `docs-site2/` (نسخه ناقص)
- [x] انتقال `context.md` → `docs/CONTEXT.md` (اشاره در root)
- [x] `.distignore` برای packaging
- [x] `bin/build-release-zip.sh` برای ساخت zip

## 4. فاز B — کیفیت کد (قبل از tag)

### 4.1 CI بدون WordPress

```bash
composer ci
composer test
composer docs:api-audit
```

انتظار: smoke، audits، PHPUnit سبز.

### 4.2 Runtime gate (نیاز به WordPress + DB)

```bash
# محلی با wp-load.php
composer release:gate

# یا Docker (توصیه‌شده)
RUN_DOCKER=1 composer pre-release
# معادل:
WPDEV_DOCKER_ENSURE_SETUP=1 composer regression:docker
```

**Blocker شناخته‌شده:** اگر DB host (`mysql`) در دسترس نباشد، `release:gate` fail می‌شود — این محیط است، نه لزوماً باگ کد.

### 4.3 P1 audits (قبل از release polished)

```bash
composer audit:waas-examples
composer audit:view-escaping:check
composer audit:sql-installer
composer audit:ajax
```

موارد باز (از [`CONTEXT.md`](CONTEXT.md)):

- nonce/capability در برخی handlerهای example
- بررسی `$wpdb` + `phpcs:ignore` در migrator
- PHPUnit: 1 warning، 22 deprecation، 1 skipped

## 5. فاز C — مستندات

```bash
composer docs:build
```

- [ ] `docs/api/manifest.json` به‌روز
- [ ] هر ماژول `modules/*/API_DOC.md` و `README.md` دارد
- [ ] `docs/framework/modules/*.md` با API هم‌خوان
- [ ] `readme.txt` changelog برای نسخه جدید
- [ ] `docs/modularization/release-X.Y.Z-notes.md` (در صورت نیاز)

باز کردن سایت مستندات محلی:

```bash
open docs/site/index.html
```

## 6. فاز D — نسخه و packaging

### 6.1 Bump version

هم‌زمان در:

- `constants.php` (`WPDEV_VERSION`)
- `wpdev.php` header
- `readme.txt` (Stable tag + changelog)
- `bin/pre-release.sh` / `bin/git-push-release.sh` (پیام tag)
- `docs/modularization/AI-PROJECT-CONTEXT.md` (در صورت نیاز)

### 6.2 ساخت zip

```bash
./bin/build-release-zip.sh
# خروجی: dist/wpdev-{version}.zip
```

Variants:

```bash
# framework + examples (پیش‌فرض)
./bin/build-release-zip.sh

# بدون examples (framework-only)
WPDEV_RELEASE_EXAMPLES=0 ./bin/build-release-zip.sh
```

### 6.3 Pre-release script

```bash
composer pre-release
RUN_DOCKER=1 composer pre-release
```

## 7. فاز E — Git tag و push

```bash
git tag -a vX.Y.Z -m 'WPDev Framework X.Y.Z'
git push origin main
git push origin vX.Y.Z
# یا:
composer push:release   # بعد از به‌روز کردن نسخه در اسکریپت
```

## 8. فاز F — smoke دستی (بعد از نصب zip)

- [ ] Network admin: Dashboard، Settings، یک example (مثلاً Products)
- [ ] Playground: `?wpdev_playground=1` (اگر فعال)
- [ ] Sunrise / domain mapping (اگر `wpdev-domains` فعال)
- [ ] غیرفعال کردن یک example — سایت نباید fatal شود

## 9. چک‌لیست نهایی

| # | Item | Command / path |
|---|------|----------------|
| 1 | Folder layout | [`STRUCTURE.md`](STRUCTURE.md) |
| 2 | CI green | `composer ci` |
| 3 | API docs fresh | `composer docs:build` |
| 4 | Runtime gate | `RUN_DOCKER=1 composer pre-release` |
| 5 | Version bumped | `constants.php`, `readme.txt` |
| 6 | Zip built | `./bin/build-release-zip.sh` |
| 7 | Tag pushed | `vX.Y.Z` |
| 8 | Manual smoke | network admin + playground |

## 10. کارهای بعد از release (non-blocking)

- پاکسازی PHPUnit deprecations
- P1 security fixes در examples
- rebrand کامل «WPDev Framework» در lang/readme
- split zip: `wpdev-framework.zip` vs `wpdev-examples.zip`
- انتشار `docs/site/` روی GitHub Pages

## 11. مراجع

- [`CONTEXT.md`](CONTEXT.md) — وضعیت فعلی پروژه
- [`modularization/regression-signoff.md`](modularization/regression-signoff.md)
- [`modularization/changelog.md`](modularization/changelog.md)
- [`code-review/2026-06-02-full-plugin-review.md`](code-review/2026-06-02-full-plugin-review.md)
- Agent skill: [`../skills/wpdev-panel-builder/SKILL.md`](../skills/wpdev-panel-builder/SKILL.md)
