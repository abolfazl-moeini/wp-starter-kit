# Funções para Migrar

## Classes pata Migrar

* wpdev_Gutenberg_Support (done)
* wpdev_Domain_Mapping (done)

* wpdev_Settings (done)
  * get_sections() (done)
  * get_settings() (done)
  * save_settings() (done)
  * get_setting() (done)
  * save_setting() (done)
  * get_logo() (done)

* wpdev_Signup (em progresso)
* wpdev_Gateway (em progresso)

* wpdev_Error_Reporting (criar tarefa)

## Importante

* wpdev_Plans (done)
* wpdev_Util (done)
* wpdev_Site_Templates (ignored)
* wpdev_Subscriptions (ignored)
* wpdev_Webhooks (ignored)
* wpdev_Site_Hooks (ignored)
* wpdev_Plans_Limits (ignore)

* wpdev_Transactions (em progresso)


* wpdev_Notification
  * Aqui, precisamos encaixar o filtro `apply_filters('wpdev_days_to_check_expired', 1)` que está sendo usado por muita gente pra mudar quantos dias devemos mandar o email de anúncio de expiração.

* wpdev_API
  * Checar com o Daniel como está essa parte da API key, para podermos organizar a migração

* wpdev_Customizer
  * Usar como referência na hora de migrar os settings para os nossos próprios customizers.

* wpdev_Shortcodes
  * Precisamos migrar os seguintes shortcodes:
    * user_meta (done)
    * paying_users (done)
    * pricing_table
    * plan_link
    * templates_list
    * restricted_content

## Models

* wpdev_Site (done)
* wpdev_Site_Template (done)
* wpdev_Site_Owner (done)
* wpdev_Broadcast (ignored)
* wpdev_Coupon (done)
* wpdev_Plan (done)
* wpdev_Subscription (done)

## Classes para Deprecar, com alternativa

* wpdev_Logger (done)
* wpdev_Links (done)
* wpdev_Mail (done) - APIs: wpdev_send_mail
* wpdev_Page (done)

## Classes para Deprecar, só para não dar fatal

* wpdev_Multi_Network (done)
* wpdev_Help_Pointers (done)

## Classes para Ignorar

* wpdev_Pro_Sites_Support (unsure)
* wpdev_Widgets (done)

## Revisar

---

# Funções para Migrar

### Signup

* wpdev_create_html_attributes_from_array
* wpdev_print_signup_field_option
* wpdev_print_signup_field_options
* wpdev_print_signup_field
* wpdev_create_user
* wpdev_create_site
* wpdev_add_signup_step (done)
* wpdev_add_signup_field (done)

### Models

* wpdev_get_coupon (done)
* wpdev_get_plan (done)
* wpdev_get_plan_by_slug (done)
* wpdev_get_current_site (done)
* wpdev_get_site (done)
* wpdev_get_subscription (done)
* wpdev_get_subscription_by_integration_key (done)
* wpdev_get_current_subscription (done)
* wpdev_is_active_subscriber (done)
* wpdev_has_plan (done)

### Functions

* wpdev_get_days_ago (done)
* wpdev_format_currency (done)

* wpdev_register_gateway (done)
* wpdev_get_gateways (done)
* wpdev_get_gateway (done)
* wpdev_get_active_gateway (done, deprecated)

* wpdev_get_interval_string (done)

* wpdev_is_account_active (ignored)
* wpdev_get_account_plan (ignored)
* wpdev_get_offset_timestamp (ignored)
* wpdev_sanitize_currency_for_saving (ignored)

### Coupon Code

* wpdev_fix_money_string (js, ignored)
* wpdev_set_setupfee_value (js, ignored)
* wpdev_set_yearly_value (js, ignored)
