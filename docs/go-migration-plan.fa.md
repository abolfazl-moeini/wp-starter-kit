# پلن جامع مهاجرت ابزار ساخت افزونه به Go با TDD واقعی

## ۱. وضعیت، هدف و حدود تعهد

**وضعیت: فقط پلن پیاده‌سازی؛ هیچ کد Go، تغییر وابستگی، نصب، build یا deploy در این مرحله انجام نمی‌شود.**

هدف کاربر، کاهش مصرف دیسک ناشی از تکرار `node_modules` در پروژه‌های افزونه است. تغییر زبان وسیله است، نه معیار موفقیت. مقصد این برنامه، انتقال منطق اختصاصی ابزار build/release/deploy به Go با حفظ رفتار قابل‌مشاهده، تست‌نویسی قبل از پیاده‌سازی و **پوشش مستقل unit test بالاتر از ۹۵٪** است.

دو شرط مستقل برای پایان پروژه وجود دارد:

1. **صحت:** برابری رفتار در محدودهٔ قراردادهای ثبت‌شده، عبور همهٔ دروازه‌های تست و عدم تغییر ناخواستهٔ خروجی یا رفتار شکست.
2. **ارزش عملی:** حذف نیاز consumer به نصب محلی ابزارهای Node متعلق به build کیت و کاهش اندازه‌گیری‌شدهٔ فضای فیزیکی مجموع پروژه‌ها و ابزارهای مشترک.

پوشش بالا اثبات نبود باگ نیست. تست واحد جای آزمون واقعی ZIP، PHP هدف، مرورگر، فایل‌سیستم و بازیابی پس از crash را نمی‌گیرد.

### تعریف «همه‌چیز به Go» در این برنامه

- تمام **منطق اختصاصی ساخت**، شامل orchestration، استخراج وابستگی asset، بسته‌بندی، cache، اعتبارسنجی، ادغام framework، مدیریت deploy و منطق PHP اختصاصیِ تبدیل، باید در موجودی مهاجرت تعیین تکلیف شود.
- منطق PHP اختصاصی صرفاً با قراردادن پشت subprocess «مهاجرت‌شده» محسوب نمی‌شود. adapter مرحلهٔ گذار است؛ انتقال هستهٔ اختصاصی آن در موج مستقل این برنامه الزامی است.
- ابزارهای شخص ثالث مانند Composer، Rector، Strauss، WP-CLI و engineِ esbuild بازنویسی نمی‌شوند؛ نسخهٔ قفل‌شدهٔ آن‌ها از Go استفاده می‌شود. باقی‌ماندن این وابستگی‌ها صریحاً در فهرست نهایی اعلام می‌شود.
- runtime افزونه‌های WordPress، framework PHP، کتابخانه‌های frontend و خود Jest/PHPUnit/TypeScript موضوع بازنویسی به Go نیستند.
- scaffold/update فقط در سطح لازم برای فراخوانی ابزار Go و حذف کپی ابزارهای build تغییر می‌کند؛ بازنویسی کل scaffolder پروژه‌ای جداست.
- ابزارهای legacy یا غیرقابل‌دسترسی از مسیر اصلی حذف ضمنی نمی‌شوند: برای هر فایل، وضعیت «انتقال»، «وابستگی خارجی»، «سازگاری موقت» یا «بازنشستگی با تأیید» ثبت می‌شود.
- هیچ مسیر شامل `eval`، رمزگشایی runtime، تولید PHP در زمان اجرای افزونه یا رفتار ممنوع در AGENTS وارد مقصد نمی‌شود. تولید artifact استاتیک هنگام build با تولید کد در runtime افزونه متفاوت است.

## ۲. تصمیم اول: مرز pnpm، build و وابستگی‌های پروژه

این تصمیم پیش از نوشتن اولین منطق Go ثبت می‌شود؛ مهاجرت زبان نباید به پیاده‌سازی ناخواستهٔ یک package manager تبدیل شود.

| دسته                       | نمونه                                                  | تصمیم هدف                                                        |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| ابزارهای اختصاصی build کیت | `@wpdev/build`، extraction plugin، orchestration و ZIP | انتقال به باینری Go؛ بدون نصب محلی Node tooling کیت در consumer  |
| ورودی‌های frontend         | Preact/React، Polaris و importهای واقعی افزونه         | حفظ graph نسخه‌بندی‌شده؛ ارزیابی pnpm برای اشتراک فیزیکی بسته‌ها |
| ابزارهای اختیاری توسعه     | Jest، Vitest، Playwright، ESLint و TypeScript          | حفظ در پروژه‌های نیازمند؛ اشتراک با package store، نه حذف تست‌ها |
| ابزارهای PHP               | Composer، Rector، Strauss، PHP interpreter و WP-CLI    | toolchain مشترکِ نسخه‌بندی‌شده؛ وابستگی PHP پروژه جدا می‌ماند    |
| موتور JS/CSS               | esbuild                                                | استفاده از Go API نسخهٔ قفل‌شده؛ انتقال pluginهای اختصاصی به Go  |

### آزمایش تصمیم وابستگی

پس از مجوز اجرای پروژه، سه consumer نمونه انتخاب می‌شوند: PHP-only، Preact/Polaris و پروژهٔ دارای تست مرورگر. برای هرکدام این سناریوها مقایسه می‌شوند:

1. وضعیت فعلی npm و ابزار build فعلی.
2. ابزار فعلی با pnpm، بدون Go؛ برای تفکیک سود package store از سود تغییر زبان.
3. ابزار Go با package store مشترک و همان dependency graph و قابلیت‌ها.

معیارها: فضای فیزیکی کل پروژه‌ها + store + cache + باینری + toolchain، فضای افزوده‌شده با consumer دوم و سوم، فضای اوج هنگام build، نصب سرد/گرم و قابلیت build بدون شبکه پس از آماده‌سازی.

- نسخه‌ها، حجم source و قابلیت‌ها باید در مقایسه ثابت باشند؛ حذف fixture، تست یا feature برای بهبود عدد ممنوع است.
- در فایل‌سیستم‌های دارای hard link یا clone، جمع سادهٔ اندازهٔ ظاهری پوشه‌ها معیار معتبر فضای فیزیکی نیست؛ روش اندازه‌گیری و محدودیت آن ثبت شود.
- سازگاری aliases، workspaceها، `file:src/polaris`، peer dependencies و resolution ابتدا آزمایش شود. pnpm در این سند «سازگارِ اثبات‌شده» فرض نشده است.
- کل `node_modules` پروژه‌ها به یک پوشهٔ global متغیر symlink نمی‌شود. نسخه و graph هر پروژه مستقل می‌ماند.
- اگر pnpm ناسازگار بود، راهکار جایگزین با شواهد ثبت می‌شود؛ این موضوع نباید با حذف وابستگی لازم پنهان شود.
- درصد هدف صرفه‌جویی پس از baseline و پیش از پیاده‌سازی با کاربر تثبیت می‌شود؛ اکنون عدد ساختگی اعلام نمی‌شود. فقدان این تصمیم، دروازهٔ ارزش محصول را باز نمی‌کند.

**انتظار واقع‌بینانه:** consumer بدون frontend می‌تواند بدون `node_modules` مربوط به build کار کند؛ consumer دارای frontend ممکن است همچنان `node_modules` سبک و link-based برای ورودی‌هایش داشته باشد. Go حذف تمام بسته‌های JS را تضمین نمی‌کند.

## ۳. موجودی مرجع و مرزهای فعلی

موجودی زیر از بررسی خواندنی کد حاصل شده است؛ گراف SCC و coverage واقعی هنوز محاسبه نشده‌اند.

| خانواده                   | مسیرهای اصلی                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ساخت کلاینت               | `core/packages/build/`، `build/`، `core/packages/utils/readProjectConfig.js`                                          |
| استخراج وابستگی WordPress | `core/packages/dependency-extraction-esbuild-plugin/`                                                                 |
| انتشار consumer           | `packages/create-wp-project/src/release/`                                                                             |
| orchestration و pipeline  | `packages/standalone-build/build-all-standalone-plugins.mjs`، `assemble-profile-s-candidate.mjs`، `build-plan.mjs`    |
| DAG، cache و evidence     | `build-dag-runner.mjs`، `build-cache-engine.mjs`، `test-dependency-registry.mjs`، `test-impact-map.mjs` در standalone |
| closure و inlining        | `inline-wpdev-closure.mjs` و inventory/gateهای closure و template                                                     |
| تبدیل اختصاصی PHP         | `plan3/symbol-analyzer.php`، `plan3/transformer.php`، `safe-ast-obfuscator.php` و `src/release/php-ast-transform.php` |
| artifact و verification   | `canonical-artifact-manifest.mjs`، `verify-profile-s-artifact.mjs`، `dev-purge-policy.mjs` و verifierهای همراه        |
| deploy و recovery         | `deploy-standalone-plugin.mjs` و implementationهای transaction در orchestrator و cache engine                         |
| انتشار مستقل ریشه         | `dev/release/build-dist.php`، `dev/fix-autoloader.php` و configهای Rector                                             |
| ترجمه                     | `dev/translation/` و `packages/translation/src/index.js`                                                              |
| اتصال consumer            | `src/generators/core.js`، `_templates.js`، `dep-versions.js` و resolverها در create-wp-project                        |

در شروع اجرا، تمام فایل‌های reachable، helperهای importشده، PHPهای درون‌خطی در JS، configهای executable، entrypointهای CLI و فایل‌های تولیدشده توسط generator به این موجودی اضافه می‌شوند. قراردادهای root `npm run release`، `composer release` و انتشار standalone یکسان فرض نمی‌شوند.

تست‌های مرجع فعلی در `tests/build/`، `tests/packages/`، `tests/phpunit/`، `packages/standalone-build/tests/` و `tests-docker/` قرار دارند. بررسی قبلی ۸۱ فایل تست standalone را نشان داده است؛ عدد نهایی باید از checkout تثبیت‌شده استخراج و با registry همگام شود، نه اینکه ۸۱ برای همیشه hardcode شود.

## ۴. معماری مقصد پیشنهادی

مسیر پیشنهادی منبع Go: `packages/build-go/`، با یک Go module و باینری موقتاً با نام `wpdev-build`. نام نهایی و module path در آغاز تثبیت می‌شوند؛ اکنون هیچ‌یک ایجاد نمی‌شود.

| لایهٔ پیشنهادی                                               | مسئولیت                                             |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `cmd/wpdev-build`                                            | composition، خروج و dispatch؛ بدون منطق کسب‌وکار    |
| `internal/config` و `internal/plan`                          | schema، precedence، capability و BuildPlan          |
| `internal/fsops` و `internal/process`                        | عملیات مرزی با قرارداد تست‌پذیر                     |
| `internal/toolchain`                                         | resolve و تأیید ابزارهای خارجی                      |
| `internal/assets`                                            | esbuild، extraction، sidecar، copy و watch          |
| `internal/php`                                               | frontend تحلیل PHP، transform و adapterهای شخص ثالث |
| `internal/closure`                                           | کشف و انتقال framework و bootstrap                  |
| `internal/artifact`                                          | purge، manifest، ZIP و verification                 |
| `internal/cache`، `internal/scheduler` و `internal/evidence` | fingerprint، DAG و مجوز مبتنی بر شواهد              |
| `internal/deploy`                                            | lock، WAL، recovery و promotion                     |
| `internal/release` و `internal/cli`                          | use case و رابط سازگار                              |
| `internal/translation`                                       | منطق اختصاصی ترجمه و adapter WP-CLI                 |

اصول طراحی:

- `wpdev.json` منبع هویت است؛ config هر پروژه immutable و مستقل از پروژه‌های دیگر باشد.
- clock، seed، cancellation و runner به‌شکل صریح تزریق شوند؛ monkey patch، global function pointer و state مشترک وابسته به cwd ممنوع است.
- interfaceهای کوچک در مرز نیاز تعریف شوند؛ برای هر struct یک interface ساختگی ایجاد نشود.
- fake برای unit، adapter واقعی برای integration؛ fake نباید منطق محصول را دوباره پیاده‌سازی کند.
- اجرای subprocess با argv مشخص، محیط allowlist‌شده و حذف secrets از log؛ رشتهٔ shell ترکیبی ساخته نشود.
- build از source به staging می‌رود؛ فایل فعال افزونه هرگز ویرایش یا محل استخراج ZIP نمی‌شود.
- دانلود toolchain فقط در مرحلهٔ آماده‌سازیِ صریح؛ build عادی ابزار جدید را مخفیانه دانلود نکند.

## ۵. Phase 0: تثبیت منبع و ساخت Oracle

قبل از ترجمه:

1. ثبت commit، وضعیت working tree، submoduleها، lockfileها، runtimeها، OS و toolchain. SHA به‌تنهایی تغییرات محلی را نمایندگی نمی‌کند؛ snapshot تغییرات موردتأیید همراه digest لازم است.
2. کار در محیط ایزوله با کمترین کپی ممکن؛ محدودیت دیسک در انتخاب worktree، cache و retention شواهد رعایت شود. هیچ reset یا پاک‌سازی destructive روی workspace کاربر انجام نمی‌شود.
3. اجرای baseline کامل تست‌های مرتبط و ثبت exit code و گزارش. تستِ شکست‌خوردهٔ قبلی نه به Go نسبت داده شود و نه نادیده گرفته شود.
4. برای رفتارهای فاقد تست، ابتدا characterization در زبان منبع نوشته و روی snapshot ثابت سبز شود. coverage نامعلوم معادل coverage کافی نیست؛ زیر ۷۰٪ زنگ خطر قطعی است، اما هر رفتار قابل‌مشاهدهٔ بدون Oracle حتی بالاتر از آن مسدودکننده است.
5. شکست ناپایدار با clock/seed/order ایزوله شود. quarantine فقط وضعیت تشخیصی است؛ قرارداد حیاتیِ دارای تست quarantineشده اجازهٔ پذیرش ندارد.
6. fixtureهای ورودی و خروجی پیش از ترجمه ثبت شوند: stdout/stderr، exit code، tree قبل/بعد، manifest، digest، subprocess request، error category و وضعیت recovery.
7. bug موجود از قرارداد مطلوب تفکیک شود؛ رفتار ممنوع یا ناامن کورکورانه بازتولید نشود. تغییر عمدی در `DIVERGENCES.md` با تست و تأیید کاربر ثبت شود.

### artifactهای حاکمیت؛ فقط هنگام اجرای آینده

- `migration/inventory.tsv`: فایل، مالکیت، نقش و وضعیت مهاجرت.
- `migration/dependency-graph.json`: import/call/exec/include و SCCها.
- `migration/manifest.tsv`: واحد، dependency، case ID و وضعیت gateها.
- `migration/contracts/`: قرارداد CLI، JSON، فایل، خطا، side effect و schema.
- `migration/fixtures/`: ورودی‌های کوچک و خروجی‌های منبع با digest.
- `migration/RULEBOOK.md`: قواعد ترجمه با ID ثابت `R-###` و نسخه.
- `migration/DIVERGENCES.md`: تفاوت‌های تأییدشده؛ پیش‌فرض هیچ تفاوتی پذیرفته نیست.
- `migration/state.json`: بودجهٔ تلاش، زمان، فضای موقت و وضعیت توقف.
- `migration/evidence/`: receipt هر واحد و هر موج.

این فایل‌ها در مرحلهٔ فعلی ساخته نمی‌شوند؛ تنها همین سند تحویل داده می‌شود.

## ۶. الگوریتم اجباری TDD برای هر واحد

واحد اجرایی واقعی یک SCC در گراف تثبیت‌شده است؛ جدول بخش بعد خانواده‌های برنامه‌ریزی است، نه ادعای محاسبهٔ SCC. SCC بزرگ را بدون seam قراردادی مصنوعی نشکنید. ترتیب گراف بر ترتیب ظاهری لایه‌ها مقدم است.

برای هر رفتار `Uxx-Cyy`:

1. **قرارداد قبل از کد:** ورودی، خروجی، خطا، side effect و مورد مرزی نوشته شود.
2. **Oracle:** تست دارای assertion واقعی روی منبع سبز شود؛ برای رفتار جدید فقط spec تأییدشده جای Oracle را می‌گیرد و با برچسب جدا ثبت می‌شود.
3. **اسکلت بی‌منطق:** فقط type، signature و stub با sentinel مجاز است. حتی defaulting، validation یا parsing در اسکلت پیاده‌سازی محسوب می‌شود و نباید جلوتر از Red نوشته شود.
4. **Clean Red:** Go compile و `go vet` عبور کنند؛ تست همان رفتار به‌سبب assertion mismatch یا sentinel شکست بخورد. خطای import، fixture setup، syntax، ابزار گمشده یا timeout محیطی Broken Red است و مجوز نوشتن منطق نمی‌دهد.
5. **ثبت شاهد Red:** `go test -json`، exit code، case ID و hash اسکلت ذخیره شود. panic یک stub نباید مانع اثبات مستقل Red سایر caseها شود؛ در صورت نیاز caseها جدا اجرا شوند.
6. **Green حداقلی:** فقط به‌اندازهٔ سبزشدن همان رفتار منطق نوشته شود؛ پیش‌نویس کامل implementation پیش از Red ممنوع است.
7. **Refactor:** فقط با suite سبز؛ هر تغییر رفتار، حلقهٔ Red جدید می‌خواهد.
8. **Coverage و mutation:** آستانه‌های بخش ۸ عبور کنند؛ تست‌هایی که صرفاً عدم panic یا فراخوانی mock را می‌سنجند برای منطق واقعی کافی نیستند.
9. **Parity و receipt:** تست‌های مرجع مرتبط و fixture replay عبور کنند و receipt ثبت شود.

چرخه برای هر case تکرار می‌شود، نه اینکه تمام implementation نوشته و در پایان تست اضافه شود. typeهای declarative بدون statement نیز با تست round-trip/schema اعتبارسنجی می‌شوند. shellها، adapterها، generatorها و ابزارهای کنترل coverage از قاعدهٔ test-first معاف نیستند.

### receipt لازم

source snapshot digest، target tree digest، toolchain/OS، rulebook hash و rule IDها، case IDها، شواهد Oracle/Red/Green، coverage صورت و مخرج، mutation نتیجه، دستورها و exit codeها، fixture digest و divergenceهای مجاز. استفاده از digest مقصد به معنی اجازهٔ commit خودکار نیست.

## ۷. واحدهای مهاجرت و تست‌های قراردادی قبل از کد

در هر ردیف، ترتیب تست‌ها چنین است: **رفتار معتبر → مرزها → خطا و عدم side effect → ویژگی‌های determinism/concurrency**. هر مورد قبل از منطق متناظر به Oracle و Clean Red متصل می‌شود.

| واحد و منبع                                       | ورودی → خروجی                                                                | تست‌هایی که باید پیش از پیاده‌سازی Go نوشته شوند                                                                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U01 — config؛ `readProjectConfig.js` و resolverها | JSON، cwd و override مجاز → config تایپ‌شده یا خطای مشخص                     | precedence واقعی؛ absent در برابر null/false/empty؛ JSON معیوب؛ config دو پروژه بدون نشت state؛ حفظ slug/domain/prefix؛ نام Unicode                                                                                                 |
| U02 — BuildPlan و target registry                 | config، profile، capability و target → برنامه و fingerprint                  | defaults هر entrypoint؛ ترکیب‌های ناسازگار؛ target ناشناخته؛ `--build-only` همراه deploy؛ تغییر capability موجب تغییر fingerprint؛ ورودی یکسان خروجی ثابت                                                                           |
| U03 — مسیر، inventory و copy                      | root، policy و درخت فایل → inventory مرتب و staging                          | فایل و پوشهٔ خالی؛ path دارای فاصله؛ symlink طبق policy؛ جلوگیری از خروج از root؛ permission و I/O error؛ عدم حذف source؛ تکرارپذیری ترتیب                                                                                          |
| U04 — process runner                              | executable، argv، env، stdin، context → خروجی و exit                         | فاصله در argv بدون shell؛ exit غیرصفر؛ stdout/stderr مجزا؛ timeout؛ cancel؛ خاتمهٔ child؛ drain خروجی؛ عدم افشای secret؛ عدم باقی‌ماندن writer پس از return                                                                         |
| U05 — toolchain مشترک                             | نسخه، پلتفرم، store و manifest → executable معتبر                            | lookup قفل‌شده؛ نسخه/معماری اشتباه؛ فایل ناقص یا digest نامعتبر؛ نصب هم‌زمان؛ offline hit/miss؛ لغو دانلود بدون promotion؛ عدم حذف نسخهٔ مورد استفاده                                                                               |
| U06 — canonicalization و hash                     | bytes، JSON و inventory → digest و bytes canonical                           | ترتیب map و آرایه طبق قرارداد؛ absent/null؛ newline و Unicode؛ تغییر یک byte؛ JSON عددی بدون کاهش precision؛ asset MD5 جدا از artifact SHA-256                                                                                      |
| U07 — JSX، alias و resolver                       | UI framework، imports و mapping → resolution و options                       | React/Preact؛ JSX runtime؛ custom globals؛ package subpath؛ local Polaris؛ import نامعتبر؛ دو پروژه با framework متفاوت؛ عدم external شدن اشتباه dependency                                                                         |
| U08 — dependency extraction                       | imports و esbuild metafile → handles، globals و internal packages            | mapping WordPress؛ dedup و ترتیب؛ import پویا طبق رفتار منبع؛ dependency مشترک؛ بستهٔ ناشناخته؛ escape مقدار PHP؛ ترتیب ثابت sidecar                                                                                                |
| U09 — bundle dependencies/vendor                  | entry و config → bundle و metadata                                           | shared Preact؛ Polaris موجود/غایب؛ globalName مشتق از config؛ artifact hash؛ failure engine بدون خروجی پذیرفته‌شده؛ اجرای JS نمونه برای بررسی API global                                                                            |
| U10 — components                                  | درخت modules و TS/TSX/script entry → bundleهای نام‌گذاری‌شده                 | discovery واقعی؛ entryهای هم‌نام در module متفاوت؛ alias؛ خطای syntax؛ نبود entry؛ نام‌گذاری و sidecar؛ عدم overwrite asset نامرتبط                                                                                                 |
| U11 — styles و assets                             | CSS موجود و assetMappings → کپی و sidecar                                    | رفتار فعلی styles یعنی metadata/hash، نه افزودن bundler جدید؛ missing file؛ overwrite policy؛ حفظ `.min` موجود و siblingها؛ copy failure و cleanup                                                                                  |
| U12 — watch                                       | event، clock و context → rebuild و shutdown                                  | fake event به‌جای sleep؛ burst و debounce؛ create/change/delete؛ failed rebuild سپس recovery؛ stop؛ عدم loop روی output؛ عدم تداخل watcher دو پروژه                                                                                 |
| U13 — purge و Composer policy                     | staging، profile و composer metadata → tree مجاز و config                    | حذف فایل توسعه و intermediate؛ حفظ LICENSE/NOTICE و فایل لازم runtime؛ تکرار اجرا؛ dependency scoped؛ خطای policy قبل از promotion؛ تفاوت generic و standalone                                                                      |
| U14 — ZIP و manifest                              | tree و metadata → ZIP و manifest                                             | stored writer عمومی در برابر writer standalone؛ ordering، permission و timestamp؛ تک‌ریشه؛ payload digest؛ duplicate entry؛ fixture کوچکِ مسیر نامجاز؛ اعمال سقف اندازه؛ خرابی CRC؛ عدم استخراج روی active                          |
| U15 — ترجمه                                       | catalog، domain، source/bundle map و JSON → merged metadata و درخواست WP-CLI | plural/context؛ UTF-8 فارسی؛ main-wins؛ فایل malformed؛ mapping منبع به bundle؛ round-trip payload؛ خطای ابزار خارجی بدون catalog ناقص                                                                                              |
| U16 — inventory framework/template                | source/provider و نمادها → closure plan                                      | closure مستقیم/انتقالی؛ provider ناقص؛ include حل‌نشده؛ ترتیب template؛ class/function collision؛ public entrypoint؛ template و assets خارج از closure وارد نشوند                                                                   |
| U17 — inliner و bootstrap                         | closure plan و staging → framework closure و loader                          | autoload order؛ include exact؛ namespace isolation؛ حفظ ancestry؛ `register(object)`؛ coexistence چند افزونه؛ template path؛ حفظ minified/unminified؛ عدم اجرای PHP از source صرفاً برای discovery                                  |
| U18 — adapterهای PHP                              | stage، target و toolchain → خروجی مرحله و گزارش                              | Rector اجباری/اختیاری طبق profile؛ نبود interpreter هدف؛ Composer no-dev و dump-autoload به‌ترتیب؛ malformed transformer JSON؛ exit ناموفق؛ عدم reuse intermediate؛ target پشتیبانی‌نشده fail-closed                                |
| U19 — frontend تحلیل PHP در Go                    | bytes PHP و نسخهٔ syntax → token/AST و diagnostic                            | corpus منبع قبل از انتخاب parser؛ namespace مختلط؛ anonymous class؛ trait/interface/enum مطابق source version؛ template PHP/HTML؛ heredoc/nowdoc؛ موقعیت خطا؛ literal byte preservation؛ syntax پشتیبانی‌نشده صریحاً رد شود         |
| U20 — symbol/scope analyzer در Go                 | AST/token و preserve policy → symbol graph و rename plan                     | inheritance؛ trait resolution؛ private shadowing؛ closure capture by-reference؛ globals و superglobals؛ string callback؛ reflection/serialization؛ public WC/WP API؛ deterministic seed؛ dynamic scope حل‌نشده fail-closed          |
| U21 — transformer اصلی در Go                      | rename plan، tokens و seed → PHP استاتیک و گزارش                             | declaration/reference هم‌زمان؛ callable کوتاه و namespace block؛ literal SQL/HTML/gettext دقیق؛ placeholderها؛ header افزونه حفظ و comment داخلی حذف؛ collision؛ lint هدف و differential اجرای fixture؛ هیچ eval/runtime decryption |
| U22 — private runtime و ابزارهای فرعی             | registry/policy و PHP source → runtime خصوصی یا خروجی utility                | parity با `private-runtime-assembler.js` و `php-ast-transform.php`؛ dynamic call حل‌نشده رد؛ prefix یکتا؛ رفتار safe utility؛ هر legacy utility یا تست مستقل داشته باشد یا با تأیید بازنشسته شود                                    |
| U23 — gates و artifact verifier                   | artifact، plan و policy → گزارش پذیرش یا رد                                  | class completeness؛ نبود DocBlock داخلی؛ header؛ syntax هر فایل؛ autoload target؛ hook و settings ownership؛ digest نامعتبر؛ intermediate leak؛ بررسی cold artifact بدون source tree                                                |
| U24 — cache و evidence                            | source/toolchain/plan و test receipts → hit/miss و مجوز مرحله                | تغییر هر جزء fingerprint؛ schema قدیمی؛ corrupt cache؛ artifact تعویض‌شده؛ receipt stale؛ hit بدون evidence کافی مجوز deploy ندهد؛ دو نویسنده؛ atomic write failure                                                                 |
| U25 — test planner و registry                     | diff، suite، profile و inventory تست → مجموعهٔ آزمون لازم                    | فایل ناشناخته باعث fallback محافظه‌کارانه؛ عدم حذف gate حیاتی؛ count واقعی برابر registry؛ skipZip ناسازگار با artifact tests؛ baseline caseهای همهٔ فایل‌های منبع mapped باشند                                                     |
| U26 — DAG scheduler                               | گراف، jobs و context → نتایج و trace                                         | ترتیب dependency؛ چرخه؛ jobs=1 و parallel؛ first failure؛ لغو pending؛ drain running؛ هم‌زمانی محدود؛ timeout؛ عدم goroutine leak؛ نتیجه مستقل از ترتیب اتمام                                                                       |
| U27 — assembler و release                         | BuildPlan و adapters → candidate یا failure                                  | generic/canonical/root مسیرهای جدا؛ ترتیب inlining/downgrade/transform/autoload/verify؛ directory-only/ZIP؛ failure هر stage؛ cleanup محدود؛ هیچ artifact ناقص پذیرفته نشود                                                         |
| U28 — lock و WAL                                  | وضعیت فایل‌سیستم، owner و event → journal transition                         | PID/host/token؛ lock متعلق به دیگری؛ stale detection طبق قرارداد؛ schema ناشناخته؛ journal ناقص؛ fsync failure؛ atomic write؛ transition غیرمجاز؛ state machine کامل                                                                |
| U29 — deploy و recovery                           | ZIP معتبر، journal و target staging → نصب یا rollback                        | snapshot همان ZIP؛ crash در هر مرز write/fsync/rename/receipt؛ recovery idempotent؛ rollback failure صریح؛ target قبلی سالم بماند؛ یک مالک transaction؛ receipt مطابق bytes نصب‌شده                                                 |
| U30 — CLI و compatibility                         | argv/env/stdin → stdout/stderr/exit و dispatch                               | help/version؛ flags ناشناخته؛ precedence؛ `--candidate` واقعاً review-only؛ default بدون deploy ناخواسته؛ signal؛ compatibility wrapper؛ خروجی قابل‌ماشین‌خواندن طبق schema                                                         |
| U31 — اتصال generator/update                      | consumer قدیمی و نسخهٔ tool → پروژهٔ قابل build با Go                        | fixture تولیدشده قبل از تغییر generator؛ idempotent update؛ حفظ فایل کاربر؛ rollback؛ pin نسخه؛ عدم افزودن Node tooling build؛ عدم حذف library/test dependency؛ build واقعی نمونهٔ تازه                                             |
| U32 — بستهٔ توزیع و کنترل کیفیت                   | binary، manifest و evidence → release قابل نصب                               | checksum و version mismatch؛ نصب ناقص؛ platform پشتیبانی‌نشده؛ offline؛ shared store GC ایمن؛ coverage checker با profile صفر/ناقص/مرزی؛ ثبت failure CI و عدم سبزشدن کاذب                                                           |

### نکات اختصاصی جدول

- unit testِ process/FS adapter باید branchها و error mapping خود Go را پوشش دهد؛ integration هم رفتار واقعی OS را جدا بررسی می‌کند.
- تست‌های ZIP با fixtureهای کوچک و محدود، فقط در temp root اجرا می‌شوند؛ آزمون حدود حجم نیازمند ساخت آرشیوهای واقعاً حجیم نیست.
- نام package پیشنهادی به‌تنهایی dependency ایجاد نمی‌کند؛ گراف واقعی تعیین می‌کند Uها در چه ترتیبی پیاده شوند.
- parser Go فرضِ موجود و سازگار ندارد: پیش از انتخاب، license، syntax coverage و توان حفظ token/literal با corpus سنجیده شود. اگر parser مناسب نبود، frontend اختصاصی خود یک زیرپروژهٔ test-first است؛ wrapper PHP به‌عنوان پایان U19 پذیرفته نمی‌شود.
- برای engines خارجی آزمون واحد روی invocation/response کافی نیست؛ contract test واقعی engine نیز باید سبز باشد، اما coverage آن به coverage unit Go اضافه نمی‌شود.

## ۸. تعریف دقیق پوشش بالاتر از ۹۵٪

### دروازه‌های مستقل و غیرقابل‌جایگزینی

1. **Unit statement coverage کل کد اختصاصی Go: بیش از ۹۵٪، با هدف عملی حداقل ۹۶٪.**
2. **هر package تولیدی دارای statement: بیش از ۹۵٪ به‌صورت مستقل.** میانگین کل نمی‌تواند package ضعیف را پنهان کند.
3. **تمام statementهای جدید/تغییریافته در هر واحد: ۱۰۰٪ تحت unit test.** هیچ مسیر اضافه‌شدهٔ بدون تست با اتکا به حداقل کل پذیرفته نمی‌شود.
4. **هر تابع تولیدی دارای رفتار:** حداقل یک تستِ رفتاری نگاشت‌شده و بدون تابع صفرپوشش؛ wrapper و CLI نیز داخل دامنه‌اند.
5. **مسیرهای حساس:** تمام انتقال‌های WAL، مجوز deploy، cache authorization، containment، rollback و fail-closed با case صریح؛ statement coverage به‌تنهایی برای این موارد کافی نیست.
6. **Integration و E2E coverage جدا گزارش شوند** و برای بالا بردن عدد unit با آن ادغام نشوند.
7. **Mutation:** حداقل ۸۰٪ mutantهای معتبر و غیرمعادل هر واحد کشته شوند؛ بازماندهٔ مربوط به قرارداد عمومی یا ایمنی مسدودکننده است، حتی اگر عدد کل عبور کند.

Go به‌صورت استاندارد statement coverage می‌دهد، نه branch coverage. شاخه‌ها و جدول حالت‌ها با contract matrix، case ID و mutation کنترل می‌شوند؛ درصد statement به‌عنوان درصد branch گزارش نمی‌شود.

### مخرج و جلوگیری از دست‌کاری

- تمام packageهای production در module، شامل adapter، CLI، installer و checkerهای اختصاصی، داخل مخرج باشند.
- نبود package در profile، statement صفرپوششِ پنهان یا package بدون تست، failure است؛ خروجی `go list` با موجودی source و coverage تطبیق داده شود.
- کد third-party دست‌نخورده داخل coverage کد اختصاصی نیست؛ generated code تولیدی متعلق به پروژه به‌صورت خودکار مستثنا نمی‌شود.
- testdata، test double، خود تست و declaration بدون statement در مخرج statement قرار نمی‌گیرند؛ هیچ فایل production فقط به‌خاطر دشوار بودن تست exclude نمی‌شود.
- build tag نباید production code را از binary آزمون ناپدید کند. تنها تست‌های integration/e2e با tag جدا شوند؛ فهرست production هر platform با build نهایی مقایسه شود.
- آزمون‌های واحد نباید وابسته به PHP، Node، WordPress، شبکه یا Docker باشند؛ این وابستگی‌ها متعلق به contract/integration هستند.
- درصد از مجموع صحیح `covered statements / total statements` و بدون گردکردن محاسبه شود. نمایش `95.0%` مجوز پذیرش نیست. هدف ≥۹۶٪ با اعداد خام، ابهام +۹۵٪ را حذف می‌کند.

### فرمان‌های برنامه‌ریزی‌شدهٔ Go

این فرمان‌ها پس از ایجاد module و تست‌ها، در `packages/build-go/` اجرا خواهند شد؛ اکنون اجرا نمی‌شوند. مسیر خروجی باید قبلاً در محیط ایزوله ایجاد و تأیید شده باشد.

```bash
go vet ./...
go test -json -count=1 ./...
go test -count=1 -race -shuffle=on ./...
go test -count=1 -cover -covermode=atomic -coverpkg=./... -coverprofile=unit.cover.out ./...
go tool cover -func=unit.cover.out
go test -count=1 -tags=integration ./...
go test -count=1 -tags=e2e ./...
```

- `go test -cover` خودش threshold را enforce نمی‌کند. یک checker نسخه‌بندی‌شده و **test-first** باید profile را بخواند، با inventory تطبیق دهد و برای کل، هر package و statementهای تغییرکرده exit غیرصفر بدهد. نام command آن هنگام پیاده‌سازی تثبیت می‌شود؛ وجود فعلی آن ادعا نمی‌شود.
- برای مرزبندی واقعی unit، integration و e2e از ابتدا فایل/تگ مجزا و بررسی CI دارند؛ unit نباید با اجرای مخفی subprocess خارجی متورم شود.
- coverage هر platform جدا بررسی شود؛ union پوشش Linux و macOS نباید فقدان تست یک شاخهٔ OS را پنهان کند.
- formatting با `gofmt` در حالت بررسی بدون تغییر خودکار و analyzer تکمیلی نسخه‌بندی‌شده مانند Staticcheck پس از انتخاب toolchain اجرا شود.
- در Clean Red فقط تست رفتار در حال پیاده‌سازی مجاز به شکست است؛ coverage و mutation gate پایان Green هستند، نه شرط سبزبودن stub.

## ۹. RULEBOOK ترجمهٔ JavaScript/PHP به Go

حداقل قواعد لازم پیش از پیاده‌سازی:

| ID    | موضوع و آزمون لازم                                                                               |
| ----- | ------------------------------------------------------------------------------------------------ |
| R-001 | absent/null/false/empty و defaulting؛ round-trip config بدون تغییر معنا                          |
| R-002 | ترتیب Object/Map در برابر map Go؛ sort فقط جایی که قرارداد اجازه می‌دهد                          |
| R-003 | UTF-16 JavaScript در برابر byte/rune Go؛ طول و slice رشتهٔ چندزبانه                              |
| R-004 | escape و newline؛ literal PHP/SQL/HTML/gettext بدون تغییر                                        |
| R-005 | JSON number؛ جلوگیری از کاهش precision و تغییر representation در digest                          |
| R-006 | regex JS/PHP در برابر RE2؛ lookaround/backreference با parser/الگوریتم یا رد صریح، نه ترجمهٔ خام |
| R-007 | exception/exit code به error taxonomy؛ حفظ stdout/stderr و دستهٔ خطا                             |
| R-008 | path، symlink، case sensitivity و separator؛ قرارداد هر platform                                 |
| R-009 | seed/time/random؛ تزریق و deterministic replay                                                   |
| R-010 | Promise/cancellation به goroutine/context؛ cancel به‌علاوهٔ drain                                |
| R-011 | mode، timestamp، fsync، atomic write و rename؛ رفتار crash نه فقط happy path                     |
| R-012 | ZIP writerهای متفاوت؛ metadata، ordering و سیاست برابری bytes                                    |
| R-013 | AST/token PHP؛ scope، inheritance، alias و literal preservation                                  |
| R-014 | cache/evidence/WAL schema؛ unknown version fail-closed و compatibility مصرح                      |
| R-015 | process env و resolution؛ بدون تکیهٔ پنهان بر checkout زیر home یا cwd                           |
| R-016 | esbuild version/options و sidecar؛ hash assets با artifact خلط نشود                              |

اگر mismatch ناشی از قاعدهٔ ناقص بود، ابتدا RULEBOOK و generator/الگوی ترجمه اصلاح شود، سپس تمام واحدهای دارای receipt وابسته به آن قاعده دوباره تولید/اعتبارسنجی شوند. اصلاح پراکندهٔ خروجی بدون ثبت علت مشترک ممنوع است.

## ۱۰. موج‌های اجرا و دروازهٔ پایان هر موج

ترتیب زیر پیشنهادی است؛ در Phase 1 با SCC واقعی اصلاح می‌شود. هیچ لایه‌ای مجاز به نقض dependency order نیست.

| موج | کار                                                                          | شرط خروج                                                                                          |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| W0  | تصمیم pnpm/build، baseline، inventory، قرارداد و fixture                     | baseline معتبر؛ scope بدون فایل بلاتکلیف؛ معیار فضای دیسک مصوب                                    |
| W1  | پایه‌ها و پایلوت حدود ۵٪ از دامنهٔ نماینده: config → hash/sidecar → CLI کوچک | Oracle/Clean Red/Green/mutation/coverage؛ fixture replay؛ بدون deploy                             |
| W2  | build کلاینت، extraction، alias، copy و watch                                | bundleها در fixture frontend درست کار کنند؛ Node wrapper build لازم نباشد                         |
| W3  | purge، ZIP، manifest، Composer policy و translation orchestration            | reproducibility؛ verifier قدیمی artifact Go را بپذیرد؛ side effects محدود                         |
| W4  | closure و adapterهای PHP؛ تثبیت رفتار پیش از انتقال موتور                    | parity inliner؛ target syntax؛ coexistence و عدم نشت intermediate                                 |
| W5  | انتقال frontend تحلیل و موتور اختصاصی PHP به Go                              | corpus کامل قرارداد؛ اجرای PHP هدف؛ عدم باقی‌ماندن PHP اختصاصی به‌عنوان implementation این واحدها |
| W6  | cache، evidence، test planning، DAG و assembler جامع                         | cache authorization درست؛ cancel/drain؛ همهٔ release pathها پوشش داده شوند                        |
| W7  | WAL، deploy و recovery در sandbox                                            | تست واقعی crash و fault injection همهٔ مرزها؛ recovery سازگار؛ هیچ live deploy                    |
| W8  | CLI سازگار، generator/update، shared toolchain و توزیع                       | consumer جدید و قدیمی قابل build؛ نبود کپی Node build tooling؛ update idempotent                  |
| W9  | validation نهایی، canary و بازنشستگی کنترل‌شده                               | همهٔ gateها؛ صرفه‌جویی اندازه‌گیری‌شده؛ rollout با مجوز جداگانه                                   |

اگر W5 به parser یا semantics حل‌نشده برخورد کند، پروژه «مهاجرت کامل» اعلام نمی‌شود. می‌توان خروجی موقت Go+PHP را با برچسب انتقال جزئی نگه داشت؛ پایان‌دادن دامنه با آن نیازمند تأیید صریح تغییر scope است.

## ۱۱. Differential testing و قرارداد artifact

برای هر fixture روی snapshot منبع و Go، مشاهدهٔ زیر مقایسه می‌شود:

`N_contract(source observation) == N_contract(go observation)`

مشاهده شامل exit، دستهٔ خطا، پاسخ JSON، stdout/stderr قراردادی، فایل‌های ایجاد/حذف‌شده، bytes لازم، permission و metadata لازم، درخواست ابزارهای خارجی و وضعیت transaction است.

### قواعد normalization

- فقط timestamp، مسیر temp یا شناسه‌ای که در قرارداد غیرمعنایی اعلام شده قابل mask است.
- mask کردن کل log، حذف خطا یا sort تمام آرایه‌ها برای سبزشدن تست ممنوع است.
- JSON معمولی می‌تواند canonical مقایسه شود؛ JSON داخل hash/signature باید دقیقاً قرارداد serialization را رعایت کند.
- فایل‌های PHP/JS/sidecar تا جایی که مصرف‌کننده یا hash به bytes وابسته است دقیق مقایسه شوند.
- خروجی compiler با تغییر نسخهٔ esbuild ممکن است متفاوت شود؛ ابتدا همان نسخه استفاده شود. تغییر نسخه migration محسوب نمی‌شود و جدا تأیید می‌خواهد.
- برای ZIP، دو مسیر موجود قرارداد جدا دارند. اگر hash/امضا به bytes ZIP وابسته است، برابری bytes لازم است. اگر قرارداد فقط محتوای استخراج‌شده باشد، entry، payload، mode، root و manifest مقایسه می‌شوند. تغییر این مرز نیازمند divergence صریح است.
- اجرای PHP fixture روی interpreter source و target و آزمون در WordPress/WooCommerce ایزوله، علاوه بر lint انجام شود؛ lint به‌تنهایی هم‌ارزی runtime نیست.

### corpus حداقلی

PHP-only، Preact، React، Polaris، چند module هم‌نام، ترجمهٔ فارسی، namespace مختلط، callback رشته‌ای، trait و inheritance، template scope، serialized callback، inlining چند افزونه، Profile S، private runtime، directory-only، cold/warm cache، خطای ابزار و recovery.

inputهای نامعتبر parser/ZIP/config محدود به corpus محلی، کم‌حجم و sandbox هستند. fuzzing درون‌پردازه‌ای برای parser و schema با محدودیت زمان/حافظه اجرا می‌شود، نه علیه سرویس یا نصب فعال.

## ۱۲. آزمون‌های ویژهٔ هم‌زمانی و deploy

برای هر transition WAL، حداقل این نقاط شکست پوشش داده شود: قبل/بعد نوشتن journal، sync فایل، sync directory، snapshot، extraction، rename اول، rename دوم، verification و receipt.

پذیرش recovery مستلزم این‌هاست:

- بازیابی تکراری نتیجهٔ پایدار بدهد و نصب سالم را تخریب نکند.
- دادهٔ ناشناخته یا journal ناسازگار fail-closed باشد؛ repair حدسی انجام نشود.
- lock متعلق به اجرای دیگر حذف نشود؛ token مالکیت قبل از release بررسی شود.
- snapshot، artifact تأییدشده و receipt به همان bytes متصل باشند.
- دو اجرای هم‌زمان نتوانند یک target را promote کنند.
- failure rollback پنهان نشود؛ مسیر پشتیبان سالم و وضعیت blocked گزارش شود.
- شبیه‌سازی خطا با fake همراه با تست process واقعیِ crash در temp filesystem باشد. fake به‌تنهایی تضمین durability نمی‌دهد.
- تست kill فرآیند، محدودیت شبیه‌سازی قطع برق واقعی دارد و در گزارش بیان شود.
- دو rename متوالی zero-downtime نیستند. سلامت PHP CLI و OPcache CLI جای healthcheck سرویس وب را نمی‌گیرد.

تا پایان W7 همهٔ این تست‌ها صرفاً در محیط disposable انجام می‌شوند. deploy واقعی و sync خروجی‌های production مجوز جداگانه می‌خواهد و از «اجرای خودکار تست» نتیجه نمی‌شود.

## ۱۳. CI، کیفیت و استقلال شواهد

### هر واحد/تغییر

Oracle receipt → compile/vet → Clean Red receipt → Green unit → coverage کل/package/diff → mutation → contract subset → review مستقل.

### هر موج

تمام unitها با seed ثبت‌شده، race detector، fixture replay موج و وابستگان، integration واقعی، inventory/registry consistency و گزارش disk budget.

### پیش از cutover

- کل تست‌های منبع و مقصد روی نسخهٔ قفل‌شده.
- تمام تست‌های canonical standalone و Docker smoke جدا؛ آزمون skipشده معادل passed نیست.
- artifact runtime در PHP 7.4 هدف و نسخهٔ source تثبیت‌شده؛ ماتریس WordPress/WooCommerce متناسب با fixtureها.
- macOS و Linux برای build؛ deploy فقط روی platformهایی که durability و recovery آن‌ها تأیید شده است. Windows تا زمان suite اختصاصی پشتیبانی‌شده اعلام نمی‌شود.
- build reproducibility، checksum، نصب سرد/گرم و offline.
- بررسی عدم حذف assertion یا کم‌کردن دامنهٔ coverage در طول مهاجرت.
- بازبین مستقل نگاشت source case → target case و mismatchهای normalization را بررسی کند.

دستورهای کیفیت فعلی ریشه که در baseline و پایان تغییرات مرتبط حفظ می‌شوند: `npm test`، `composer test`، `npm run typecheck`، `npm run lint:js`، `composer validate:phpstan` و `composer validate:cs`. suite standalone با `npm test` در working directory همان package و smoke با script اختصاصی `test:docker-smoke` اجرا می‌شود. وجود و تنظیمات دقیق در snapshot آغاز اجرا دوباره تأیید می‌شوند؛ این سند نتیجهٔ سبز برای آن‌ها ادعا نمی‌کند.

## ۱۴. توقف، بودجه و رفع شکست

- حداکثر سه تلاش محلی برای هر شکست با فرضیه و شاهد متفاوت؛ تکرار بدون اطلاعات جدید ممنوع.
- mismatch مشترک → اصلاح RULEBOOK → invalidation receipt واحدهای وابسته → replay دوباره.
- سه واحد blocked متوالی، parser ناکافی، schema مبهم، صرفه‌جویی تأییدنشده یا تغییر قاعده‌ای که بیش از دو واحد سبز را بشکند → توقف مهندسی و گزارش تصمیم لازم.
- محدودیت دیسک، زمان و حجم fixture در state ثبت شود. فایل‌های موقت فقط از محدودهٔ مالکیت اجرای جاری پاک شوند؛ source، نصب فعال و cache دیگر پروژه‌ها دست‌نخورده بمانند.
- retention باید یک baseline قابل‌بازتولید و شواهد آخرین اجرای پذیرفته‌شده را حفظ کند؛ همهٔ ZIPهای تکراری هر واحد نگه‌داری نشوند.
- ابزار mutation در W0 برای Go version انتخاب و pin شود. mutant معادل فقط با دلیل قابل‌بازبینی حذف شود؛ timeout یا crash زیرساخت به‌عنوان killed موفق شمرده نشود.
- تغییر threshold، حذف unit test، تست skipشده یا پذیرش تفاوت، راه خودکار خروج از شکست نیست.

## ۱۵. rollout و rollback برنامه‌ریزی‌شده

1. Go در حالت build-only کنار نسخهٔ مرجع خروجی می‌دهد؛ هیچ نوشتن دوگانه روی مقصد فعال وجود ندارد.
2. یک consumer کم‌ریسک با profileهای واقعی انتخاب و خروجی مقایسه می‌شود.
3. پس از تأیید، generator جدید به نسخهٔ Go قفل‌شده اشاره می‌کند؛ نسخهٔ قبلی همچنان برای rollback قابل‌بازتولید است.
4. پروژه‌های موجود با migration idempotent و backup کوچک تنظیمات منتقل می‌شوند؛ وابستگی‌های frontend/test حذف خودکار نمی‌شوند.
5. deploy تنها پس از مجوز و gateهای WAL؛ هر transaction فقط یک engine مالک دارد.
6. Go باید journal قدیمیِ پشتیبانی‌شده را بازیابی کند یا قبل از upgrade وجود transaction ناتمام را مانع شود. اجرای نسخهٔ قدیمی روی journal جدیدِ ناشناخته ممنوع است.
7. rollback شامل نسخهٔ toolchain، config و artifact است؛ صرف تعویض binary بدون بررسی schema کافی نیست.
8. ابزار قدیمی فقط پس از گذر دورهٔ canary موردتوافق و داشتن روش rollback بازنشسته شود؛ دوره و targetها پیش از cutover تثبیت شوند.

## ۱۶. چک‌لیست نهایی پذیرش

- [ ] هر فایل اختصاصی build وضعیت صریح در inventory دارد؛ هیچ helper یا PHP درون‌خطی جا نمانده است.
- [ ] منطق اختصاصی Go کامل است؛ adapter موقت PHP به‌عنوان مهاجرت کامل گزارش نشده است.
- [ ] dependencyهای third-party و runtimeهای باقی‌مانده دقیقاً فهرست شده‌اند.
- [ ] هر رفتار receipt Oracle → Clean Red → Green دارد؛ هیچ منطق قبل از تست نوشته نشده است.
- [ ] پوشش unit کل و هر package بیش از ۹۵٪، با هدف ≥۹۶٪ خام است.
- [ ] statementهای جدید/تغییریافته ۱۰۰٪ unit-tested؛ هیچ تابع رفتاری صفرپوشش وجود ندارد.
- [ ] mutation ≥۸۰٪ و هیچ mutant بازماندهٔ مؤثر بر قرارداد عمومی/ایمنی پذیرفته نشده است.
- [ ] unit، integration و E2E گزارش جدا دارند؛ هیچ skip به‌عنوان موفقیت ثبت نشده است.
- [ ] fixture replay و runtime PHP/WordPress/WooCommerce در دامنهٔ قرارداد عبور کرده‌اند.
- [ ] ZIP، manifest، hash و schemaها مطابق قرارداد یا divergence تأییدشده‌اند.
- [ ] registry تست‌ها با موجودی واقعی هماهنگ است.
- [ ] cache hit به‌تنهایی مجوز deploy نمی‌دهد؛ cancellation، WAL و recovery واقعی تست شده‌اند.
- [ ] consumer برای ابزارهای Node اختصاصی build کیت، نصب محلی نیاز ندارد.
- [ ] graph frontend و ابزارهای تست ضروری حفظ شده‌اند؛ صرفه‌جویی دیسک بدون حذف قابلیت اندازه‌گیری شده است.
- [ ] shared toolchain قابل pin، offline و rollback است؛ پاک‌سازی آن به پروژهٔ دیگر آسیب نمی‌زند.
- [ ] معیار صرفه‌جویی تعیین‌شده در W0 محقق و گزارش شده است.
- [ ] cutover/deploy مجوز جداگانه دارد؛ هیچ پوشهٔ فعال مستقیماً ویرایش یا unzip نشده است.

**تعریف پایان:** تحویل صرفاً یک باینری Go یا عدد coverage نیست؛ تحویل مجموعه‌ای از واحدهای test-first با شواهد قابل‌بازتولید، رفتار سازگار در قرارداد مشخص و کاهش واقعی هزینهٔ دیسک برای پروژه‌های افزونه است.
