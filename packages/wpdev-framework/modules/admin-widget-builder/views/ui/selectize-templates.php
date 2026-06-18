<?php
/**
 * Selectize templates view.
 *
 * @since 2.0.0
 */
?>
<!-- WP User Template -->
<script type="text/html" id="wpdev-template-user">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      {{ typeof avatar !== 'undefined' ? avatar : '' }}

    </div>

    <div>

      <span class="wpdev-block">{{ display_name }} (#{{ ID }})</span>

      <small>{{ typeof user_email !== 'undefined' ? user_email : '<?php _e('Undefined'); ?>' }}</small>

    </div>

  </div>

</script>
<!-- /WP User Template -->

<!-- Customer Template -->
<script type="text/html" id="wpdev-template-customer">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      {{ typeof avatar !== 'undefined' ? avatar : '' }}

    </div>

    <div>

      <span class="wpdev-block">{{ display_name }} (#{{ id }})</span>

      <small>{{ typeof user_email !== 'undefined' ? user_email : '<?php _e('Undefined'); ?>' }}</small>

    </div>

  </div>

</script>
<!-- /Customer Template -->

<!-- Membership Template -->
<script type="text/html" id="wpdev-template-membership">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      {{ typeof customer.avatar !== 'undefined' ? customer.avatar : '' }}

    </div>

    <div>

      <span class="wpdev-block">{{ reference_code }} (#{{ id }})</span>

      <small>Customer: {{ customer.display_name }}</small><br>

      <small>{{ formatted_price }}</small>

    </div>

  </div>

</script>
<!-- /Membership Template -->

<!-- Site Template -->
<script type="text/html" id="wpdev-template-site">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      {{ typeof image !== 'undefined' ? image : '' }}

    </div>

    <div>

      <span class="wpdev-block">{{ title }}</span>

      <small>{{ siteurl }}</small><br>

    </div>

  </div>

</script>
<!-- /Site Template -->

<!-- Setting Template -->
<script type="text/html" id="wpdev-template-setting">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ title }}</span>

      <small>{{ section_title }}</small><br>

      <small>{{ desc }}</small>

    </div>

  </div>

</script>
<!-- /Setting Template -->

<!-- Product Template -->
<script type="text/html" id="wpdev-template-product">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      {{ typeof image !== 'undefined' ? image : '' }}

    </div>

    <div>

      <span class="wpdev-block">{{ name }} ({{ type }})</span>

      <small>{{ formatted_price }}</small>

    </div>

  </div>

</script>
<!-- /Product Template -->

<!-- Plan Template -->
<script type="text/html" id="wpdev-template-plan">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      {{ typeof image !== 'undefined' ? image : '' }}

    </div>

    <div>

      <span class="wpdev-block">{{ name }} ({{ type }})</span>

      <small>{{ formatted_price }}</small>

    </div>

  </div>

</script>
<!-- /Plan Template -->

<!-- Jumper Link Template -->
<script type="text/html" id="wpdev-template-jumper-link">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ text }}</span>

      <small><?php _e('Network Admin', 'wpdev'); ?> &rarr; {{ group }}</small>

    </div>

  </div>

</script>
<!-- /Jumper Link Template -->

<!-- Jumper Command Template -->
<script type="text/html" id="wpdev-template-jumper-command">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ title }}</span>

      <small>{{ group_label }}</small>

    </div>

  </div>

</script>
<!-- /Jumper Command Template -->

<!-- Discount Code Template -->
<script type="text/html" id="wpdev-template-discount_code">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ code }} (#{{ id }})</span>

      <small>{{ discount_description }}</small>

    </div>

  </div>

</script>
<!-- /Discount Code Template -->

<!-- Domain Template -->
<script type="text/html" id="wpdev-template-domain">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ domain }}</span>

      <small><?php _e('Mapped Domain', 'wpdev'); ?></small>

    </div>

  </div>

</script>
<!-- /Domain Template -->

<!-- Webhook Template -->
<script type="text/html" id="wpdev-template-webhook">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ name }}</span>

      <small>{{ webhook_url }}</small>

    </div>

  </div>

</script>
<!-- /Webhook Template -->

<!-- Broadcast Template -->
<script type="text/html" id="wpdev-template-broadcast">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ title }}</span>

    </div>

  </div>

</script>
<!-- /Broadcast Template -->

<!-- Checkout Form Template -->
<script type="text/html" id="wpdev-template-checkout_form">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ name }}</span>

      <small>{{ slug }}</small>

    </div>

  </div>

</script>
<!-- /Checkout Form Template -->

<!-- Page Template -->
<script type="text/html" id="wpdev-template-page">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div>

      <span class="wpdev-block">{{ post_title }} (#{{ ID }})</span>

      <small>/{{ post_name }} - {{ post_status.charAt(0).toUpperCase() + post_status.slice(1) }}</small>

    </div>

  </div>

</script>
<!-- /Page Template -->

<!-- Default Template -->
<script type="text/html" id="wpdev-template-default">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <div v-if="avatar">

      {{ avatar }}

    </div>

    <div>

      <span class="wpdev-block">{{ label ?? id }} (#{{ id }})</span>

      <small>{{ description ?? id }}</small>

    </div>

  </div>

</script>
<!-- /Default Template -->

<!-- Nothing Found Template -->
<script type="text/html" id="wpdev-template-none">

  <div class="wpdev-p-4 wpdev-block wpdev-flex wpdev-items-center">

    <?php _e('Nothing Found...', 'wpdev'); ?>

  </div>

</script>
<!-- /Nothing Found Template -->

<?php

  /**
   * Allow plugin developers to add more selectize templates.
   *
   * @since 2.0.0
   *
   */
  do_action('wpdev_selectize_templates');

?>
