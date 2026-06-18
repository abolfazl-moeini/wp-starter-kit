# بررسی پلن WPDev Framework Refactor

تاریخ بررسی: 2026-06-02  
منبع پلن: WPDev Framework Refactor Plan (خروجی آنالیز AI دیگر)  
مبنای تطبیق: وضعیت ریپو (`composer test`, `docs/modularization/migration-inventory.md`, کد `modules/` و `examples/`)

---

## جمع‌بندی

پلن از نظر **جهت کلی** درست است (Framework generic + WaaS Examples با حفظ slugها)، اما بخش زیادی از کار را **دوباره توصیف می‌کند** در حالی که در ریپو جداسازی examples تقریباً انجام شده است. کار باقی‌مانده عمدتاً **shell split**، **decoupling عمیق در `modules/core`**، و **rebrand** است — نه مهاجرت کامل از صفر.

---

## ایرادهای اصلی پلن

### 1. وضعیت واقعی پروژه کم‌برآورد شده (پلن شبیه شروع از صفر است)

طبق `docs/modularization/migration-inventory.md` جداسازی Framework/Examples برای **۱۹ ماژول WaaS** با وضعیت **complete** ثبت شده است.

- `modules/README.md` و `examples/README.md` همین قرارداد را دارند.
- `wpdev_load_examples()` بعد از `modules/` روی `wpdev_modules_loaded` اجرا می‌شود.

پلن انگار هنوز باید کل دامنه را از `modules/` به `examples/` منتقل کند؛ در حالی که کار باقی‌مانده طبق inventory عمدتاً **«shell split»** است:

| ماژول | باقی‌مانده (طبق inventory) |
|--------|---------------------------|
| `admin-custom-page` | Top nav، ویجت‌های داشبورد |
| `admin-setting-page` | سکشن‌های پیش‌فرض دامنه |
| `wizard` | Sunrise + playground |

**نکته:** `examples/admin-setting-page-defaults` وجود دارد ولی هنوز `class-wpdev-settings-default-sections.php` را از `modules/admin-setting-page/` لود می‌کند — یعنی **اسکلت جدا شده، محتوا نه**.

---

### 2. لیست slugها و audit ناقص و گاهی نادرست

پلن فقط چند slug می‌زند (`wpdev-products`, `wpdev-domains`, …) و یک‌بار `wpdev-checkout` — در حالی که صفحه لیست checkout **`wpdev-checkout-forms`** است.

در inventory و `examples/*/setup.php` این‌ها هم هستند و در audit پلن **نیامده‌اند**:

- `wpdev-customers`, `wpdev-sites`, `wpdev-memberships`, `wpdev-emails`, `wpdev-gateways`
- `wpdev-customer-panel`, `wpdev-platform`, `wpdev-system`, `wpdev-taxes`, `wpdev-webhooks`, `wpdev-events`, `wpdev-discount-codes`
- ماژول‌های bridge: `admin-setting-page-defaults`, `admin-custom-page-dashboard-widgets`, `playground-parity`, …

**ایراد:** audit پیشنهادی پلن اگر فقط ۶–۷ slug را چک کند، **رگرسیون واقعی** را نمی‌گیرد.

---

### 3. «حذف coupling از `modules/`» سطحی است؛ coupling عمیق‌تر در `core` مانده

پلن عمدتاً `admin-setting-page`, `admin-custom-page`, playground را می‌زند، اما **`modules/core` هنوز مستقیم به APIهای WaaS وابسته است**:

| فایل / ناحیه | وابستگی |
|--------------|---------|
| `class-faker.php` | `wpdev_create_checkout_form` |
| `class-migrator.php`, `class-default-content-installer.php` | products, checkout |
| `helpers/validation-rules/class-site-template.php`, `class-products.php` | `wpdev_get_product` |
| `compat/class-legacy-shortcodes.php`, `class-product-compat.php` | products, checkout fields |
| `playground/class-playground-seeder.php` | products, checkout forms |
| `class-scripts.php` | ثبت asset `wpdev-checkout` از ماژول example |

همچنین `admin-setting-page` هنوز `use WPDevFramework\Checkout\Checkout_Pages` دارد؛ کلاس در **`examples/checkout`** است — coupling نوعی، نه فقط لینک منو.

پلن می‌گوید `wpdev_get_product()` وقتی example حاضر است بماند؛ اما بسیاری از callها **`function_exists` ندارند**. استراتژی guard، interface، یا optional capability در پلن **نیست**.

---

### 4. Top admin nav: محل واقعی boot در پلن نیامده

- لینک‌های products/customers/payments: `modules/admin-custom-page/class-top-admin-nav-menu.php`
- **Instantiate:** `modules/core/src/class-wpdev.php` (حدود خط 332–334)

```php
if ( class_exists( 'WPDev\\Admin_Pages\\Top_Admin_Nav_Menu' ) ) {
    new WPDevFramework\Admin_Pages\Top_Admin_Nav_Menu();
}
```

پلن فقط «منتقل به example registration» می‌گوید، **بدون:**

- API جدید (مثلاً `wpdev_register_admin_bar_nodes`)
- حذف instantiate سخت‌کد از core
- ترتیب لود نسبت به `wpdev_admin_pages`

---

### 5. Multisite «framework-optional» با کد فعلی هم‌خوان نیست

- `Requirements::met()` فقط PHP/WP را چک می‌کند (مناسب single-site).
- `Requirements::is_multisite()` هنوز notice «WPDev requires multisite» دارد؛ docblock `met()` هنوز multisite را ذکر می‌کند — **ناهماهنگی مستندات/رفتار**.
- Installer، `get_network_option`, domain tables، wizard/sunrise فرض network دارند.

پلن می‌گوید core بدون multisite بوت شود؛ **معیار پذیرش** (چه صفحاتی کار کنند، disable چه چیز، رفتار `WP_TESTS_MULTISITE`) **تعریف نشده**.

---

### 6. Sunrise / wizard: «optional» بدون طراحی مهاجرت

- `modules/wizard/setup.php` همیشه `Sunrise::manage_sunrise_updates()` را لود می‌کند.
- `composer.json`: `audit:sunrise` در `ci` و `release:gate`.

پلن نمی‌گوید:

- آیا `wizard` برای framework-only نصب لازم است؟
- چه اتفاقی برای `bin/audit-sunrise.php` و regressionهای domain mapping می‌افتد؟
- آیا sunrise فقط با `wpdev-domains` example فعال شود؟

---

### 7. Audit پیشنهادی WaaS wording با tooling موجود هم‌پوشانی ندارد

`composer audit:module-naming` فقط:

- پیشوند `wpdev-*` در `modules/`
- تعریف `function wpdev_*` در فایل‌های PHP

را می‌گیرد — **نه** متن WaaS.

پلن audit جدید WaaS/business wording می‌خواهد ولی:

- allowlist (compat، `@deprecated`، playground parity) تعریف نشده
- ادغام با `ci` / `release:gate` نیست
- `audit:example-apis`, `audit:dependency-ownership` ذکر نشده

خطر: دو لایه audit متناقض یا redundant.

---

### 8. Test plan با شکست‌های فعلی ناسازگار است

**وضعیت زمان بررسی:** `composer test` → Tests: 285, **Failures: 9**

شامل:

- `ShimInventoryTest` — `inc/README.md` (gate فاز 2.9)
- `SettingsSaveTest` — merge/reset (ربط مستقیم به rebrand ندارد)

پلن «اول baseline» را درست می‌گوید، اما:

- **پاکسازی `inc/`** در Gap Fix Areas نیست (در حالی که `audit:inc-complete` در CI است)
- `regression:playground:core-only` از قبل وجود دارد — پلن آن را نمی‌شناسد
- اولویت root cause برای `SettingsSaveTest` نیست

---

### 9. Rebrand بدون scope مشخص

پلن: symbols، text domain، `wpdev-*` slugs پایدار (خوب).

**نیامده:**

- نام نمایشی منو (`WPDev` → `WPDev Framework`؟)
- `readme.txt` / wordpress.org
- `lang/` ترجمه‌ها
- `context.md`, skills (`wpdev-panel-builder`)
- نسخه‌گذاری (2.5.0 — messaging-only minor؟)
- `wp-dev.php` دوم با همان description قدیمی WaaS

---

### 10. موارد مهم در scope پلن نیامده‌اند

| موضوع | چرا مهم |
|--------|---------|
| `Legacy_Shim_Autoloader` / `Examples_Shim_Autoloader` | BC و حذف `inc/` |
| `action-scheduler` در `modules/core/dependencies/` | vendor در core |
| `examples/customer-panel` + frontend/shortcodes | بخش عمومی محصول |
| `modules/field-builder/examples/` + `wpdev_get_products` | domain ref در framework |
| `admin-widget-builder` views | `wpdev_get_products` در framework |
| فیلتر `wpdev_module_enabled` | رفتار «framework بدون WaaS» |
| License / setup wizard / `wpdev_setup_finished` | boot واقعی |

---

### 11. فرض «WaaS فقط در examples» با playground/core در تضاد جزئی

در `modules/core` هنوز «WaaS» در playground contract، parity registry، admin CSS (~۱۵ فایل) هست.

پلن playground terminology generic می‌خواهد **بدون** تعریف اینکه parity map WaaS کجا زنده بماند (`examples/playground-parity`).

---

### 12. فازبندی و ترتیب اجرا مشخص نیست

**ترتیب پیشنهادی منطقی:**

1. Phase 0: baseline tests + `inc/` gate + `SettingsSaveTest`
2. انتقال **فیزیکی** `WPDev_Settings_Default_Sections` به `examples/` (نه فقط hook bridge)
3. API admin bar + حذف instantiate از `class-wpdev.php`
4. `function_exists` / contracts برای callهای core به توابع example
5. rebrand header/docs (با scope بالا)
6. multisite policy + matrix تست

بدون این، ریسک شکستن settings/network admin بین PRها بالاست.

---

### 13. `functions-waas.php` بزرگ‌نمایی شده

فایل فقط shim به `functions-module-managers.php` است — کار کوچک، نه gap اصلی refactor.

---

## نکات درست پلن (نگه دارید)

- تفکیک **Framework generic** vs **WaaS Examples** با حفظ slugها
- نگه داشتن `examples/*` به‌عنوان suite نمونه (حذف نشود)
- اولویت repair به `composer test` قبل از refactor بزرگ
- هم‌راستایی با `migration-inventory.md` اگر به‌عنوان **فاز باقی‌مانده** بازنویسی شود

---

## پیشنهاد اصلاح پلن

### عنوان پیشنهادی

**Phase 3: Framework shell decoupling + product identity**  
(نه «Full refactor»)

### Deliverables قابل اندازه‌گیری

- [ ] صفر `use WPDevFramework\Checkout\*` (و سایر namespaceهای example) در `modules/`
- [ ] صفر فراخوانی `wpdev_get_product` / `wpdev_create_checkout_form` **بدون guard** در `modules/core`
- [ ] انتقال فیزیکی `class-wpdev-settings-default-sections.php` به `examples/admin-setting-page-defaults/`
- [ ] Top nav فقط via hook/API؛ حذف `new Top_Admin_Nav_Menu()` از `class-wpdev.php`
- [ ] `inc/` فقط طبق gate فاز 2.9 (یا README به allowlist audit)
- [ ] `composer test` + `composer ci` سبز

### Test Plan — همه module idهای WaaS (از inventory)

```
wpdev-addons
wpdev-broadcasts
wpdev-checkout
wpdev-customer-panel
wpdev-customers
wpdev-dashboard
wpdev-discount-codes
wpdev-domains
wpdev-emails
wpdev-events
wpdev-gateways
wpdev-memberships
wpdev-payments
wpdev-platform
wpdev-products
wpdev-sites
wpdev-system
wpdev-taxes
wpdev-webhooks
```

**صفحات مهم:** `wpdev-checkout-forms` (نه فقط `wpdev-checkout`).

### Multisite matrix (تعریف شود)

| حالت | انتظار |
|------|--------|
| Single-site + framework modules | بوت، بدون fatal؛ WaaS pages غیرفعال یا graceful |
| Multisite + همه examples | رفتار فعلی حفظ شود |
| `WP_TESTS_MULTISITE` | تست‌ها سبز؛ installer tables |

### Audit — ادغام با موجود

- گسترش `audit:module-naming` یا اسکریپت جدید با allowlist
- نگه `audit:example-apis`, `audit:dependency-ownership`
- wire در `composer ci` یک‌بار، بدون duplicate gate

### Phase 0 (قبل هر rebrand)

1. رفع ۹ failure `phpunit`
2. `inc/` tree audit
3. `SettingsSaveTest` root cause

---

## فایل‌های مرجع در ریپو

- `docs/modularization/migration-inventory.md`
- `docs/modularization/migration-guide.md`
- `modules/README.md`
- `examples/README.md`
- `examples/admin-setting-page-defaults/setup.php`
- `modules/core/src/class-wpdev.php`
- `modules/admin-setting-page/src/class-wpdev-settings-default-sections.php`
- `modules/admin-custom-page/class-top-admin-nav-menu.php`
- `composer.json` (scripts: `ci`, `audit:module-naming`, `regression:playground:core-only`)

---

## پلن اصلی (خلاصه برای مقایسه)

**هدف اعلام‌شده:** تبدیل هویت به WPDev Framework؛ حفظ منوی `wpdev` و examples فعلی WaaS.

**قوانین کلیدی پلن:**

- Framework/docs/modules generic
- `examples/*` = WaaS Examples، بدون تغییر slug
- حذف coupling WaaS از `modules/`
- multisite اختیاری در core
- APIهای BC مثل `wpdev_get_product()` با حضور example

**Gap Fix Areas پلن:** `wpdev.php`, `admin-setting-page`, `admin-custom-page`, `core`, `wizard`/sunrise, docs.

**Test Plan پلن:** baseline tests → audit wording → audit slugs → playground split → `composer test` + smoke + audits.

---

*این سند فقط بررسی پلن است؛ اجرای refactor در این فایل تعریف نشده.*
