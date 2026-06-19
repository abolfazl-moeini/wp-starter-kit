# راهنمای شروع سریع — wp-starter-kit

> یک پلاگین وردپرس با CLI، ماژول‌بندی PHP، TypeScript و esbuild بسازید.

---

## پیش‌نیازها

- **Node.js** نسخه ۱۸ به بالا
- **PHP** نسخه ۷.۴ به بالا (برای توسعه، ۸.۱+ توصیه می‌شود)
- **Composer**

---

## یک پلاگین جدید بسازید

```bash
npm create @wpdev/plugin@latest my-plugin
```

CLI یک wizard تعاملی اجرا می‌کند:

1. نام پلاگین و branding (slug، namespace، text domain)
2. انتخاب preset یا تنظیم دستی feature ها
3. نصب خودکار dependencies (اختیاری)

برای اجرای غیرتعاملی (CI) از `--yes` استفاده کنید:

```bash
npm create @wpdev/plugin@latest my-plugin -- --yes \
  --js=typescript --js-lib=preact --php-min=8.1
```

---

## دستورات اصلی CLI

```bash
wpdev create [slug]          # ساخت پلاگین جدید
wpdev add <feature>          # اضافه کردن یک feature
wpdev remove <feature>       # حذف یک feature
wpdev set <key> <value>      # تنظیم مقادیر config-only
wpdev update [dir]           # نمایش پلن آپگرید (--run برای اعمال)
wpdev doctor [dir]           # بررسی سلامت پروژه
wpdev info [dir]             # نمایش نسخه kit و وضعیت feature ها
wpdev list [dir]             # لیست feature های فعال
```

---

## Feature های اصلی

| Feature         | مقادیر                         | پیش‌فرض      |
| --------------- | ------------------------------ | ------------ |
| `js`            | `typescript` / `pure` / `none` | `typescript` |
| `jsLib`         | `none` / `preact` / `react`    | `none`       |
| `phpMinVersion` | `7.4` / `8.0` / `8.1` / `8.2`  | `7.4`        |
| `blocks`        | `on` / `off`                   | `off`        |
| `phpFramework`  | `none` / `wpdev`               | `none`       |
| `ci`            | `on` / `off`                   | `off`        |

برای لیست کامل: [features-reference.md](features-reference.md)

---

## بعد از scaffold

```bash
cd my-plugin
npm install          # اگر js فعال است
composer install     # اگر phpunit فعال است
npm run build        # ساخت bundle های JS/CSS
npm test             # اجرای Jest
composer test        # اجرای PHPUnit
```

---

## اضافه یا حذف کردن feature

```bash
# اضافه کردن Preact
wpdev add jsLib preact

# حذف blocks
wpdev remove blocks

# تغییر نسخه PHP هدف
wpdev set phpMinVersion 8.1

# بررسی وضعیت پروژه
wpdev doctor
```

---

## آپگرید kit

```bash
# نمایش تغییرات
wpdev update

# اعمال تغییرات
wpdev update --run
```

---

## ساختار پروژه تولیدشده

```
my-plugin/
├── wpdev-kit.json              # manifest — source of truth
├── project.config.json         # branding و تنظیمات runtime
├── src/
│   └── Modules/
│       └── ExampleFeature/
│           ├── Module.php      # implement کننده ModuleInterface
│           └── assets/entries/
│               └── admin.ts    # entry point JS (auto-discovered)
├── assets/bundles/             # خروجی build
└── tests/
    ├── phpunit/
    └── (jest tests)
```

---

## لینک‌های مفید

- [CLI Reference](cli-reference.md) — تمام دستورات و flag ها
- [Features Reference](features-reference.md) — کاتالوگ کامل feature ها
- [Module Guide](module-guide.md) — ساخت ماژول PHP جدید
- [Troubleshooting](troubleshooting.md) — رفع خطاهای رایج
- [API Reference (JS)](api/js-reference.md) — پکیج‌های `@wpdev/*`
- [API Reference (PHP)](api/php-reference.md) — کلاس‌های PHP
