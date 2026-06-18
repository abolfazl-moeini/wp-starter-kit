<?php
/**
 * Activity stream view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling">

  <div id="activity-stream-content">

    <div v-if="loading"
      class="wpdev-text-center wpdev-bg-gray-100 wpdev-rounded wpdev-uppercase wpdev-font-semibold wpdev-text-xs wpdev-text-gray-700 wpdev-p-4">
      <span class="wpdev-blinking-animation"><?php _e('Loading...', 'wpdev'); ?></span>
    </div>

    <div v-if='!queried.count && !loading' v-cloak class='wpdev-feed-loading wpdev-mb-6'>
      <?php _e('No more items to display', 'wpdev'); ?>
    </div>

    <div v-if="!loading" class="wpdev-widget-inset">

      <ul class="wpdev-m-0 wpdev-p-0 wpdev-divide-gray-200" v-cloak>

        <li
          class="wpdev-m-0"
          :class="index > 0 ? 'wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300' : ''"
          v-for="(event, index) in queried.events"
        >
          <a :href="'<?php echo wpdev_network_admin_url('wpdev-view-event', array('id' => '')); ?>=' + event.id" class="wpdev-block hover:wpdev-bg-gray-50">
            <div class="wpdev-px-4 wpdev-py-4 wpdev-flex wpdev-items-center">
              <div class="wpdev-min-w-0 wpdev-flex-1 sm:wpdev-flex sm:wpdev-items-center">
                <div class="wpdev-mt-4 wpdev-flex-shrink-0 sm:wpdev-mt-0 sm:wpdev-mr-4">
                  <div class="wpdev-flex wpdev-relative">

                    <img v-if="event.author.avatar"
                      class="wpdev-inline-block wpdev-h-7 wpdev-w-7 wpdev-rounded-full wpdev-ring-2 wpdev-ring-white"
                      :src="event.author.avatar"
                      :alt="event.author.display_name"
                    >

                    <div v-if="!event.author.avatar" class="wpdev-flex wpdev-h-7 wpdev-w-7 wpdev-rounded-full wpdev-ring-2 wpdev-ring-white wpdev-bg-gray-300 wpdev-items-center wpdev-justify-center">
                      <span class="dashicons-wpdev-tools wpdev-text-gray-700 wpdev-text-xl"></span>
                    </div>

                    <span
                      role="tooltip"
                      :aria-label="event.initiator.charAt(0).toUpperCase() + event.initiator.slice(1) + ' - ' + event.severity_label"
                      class="wpdev-absolute wpdev-rounded-full wpdev--mb-2 wpdev--mr-2 wpdev-flex wpdev-items-center wpdev-justify-center wpdev-font-mono wpdev-bottom-0 wpdev-right-0 wpdev-font-bold wpdev-h-3 wpdev-w-3 wpdev-uppercase wpdev-text-2xs wpdev-p-1 wpdev-border-solid wpdev-border-2 wpdev-border-white"
                      :class="event.severity_classes"
                    >
                      {{ event.severity_label[0] }}
                    </span>

                  </div>
                </div>
                <div>
                  <div class="wpdev-flex wpdev-font-medium wpdev-text-gray-700 wpdev-truncate">
                    <p class="wpdev-m-0 wpdev-p-0 wpdev-capitalize">{{ event.object_type }}</p>
                    <p class="wpdev-p-0 wpdev-m-0 wpdev-ml-1 wpdev-font-normal wpdev-text-gray-600">
                      <?php printf(__('with %s', 'wpdev'), '{{ event.slug }}'); ?>
                    </p>
                  </div>
                  <div class="wpdev-mt-1">
                    <div class="wpdev-text-sm wpdev-text-gray-600">
                      <!-- Heroicon name: calendar -->
                      <p class="wpdev-p-0 wpdev-m-0">
                        <span v-html="event.message"></span>
                        <span class="wpdev-text-gray-700 wpdev-ml-2"><span class="dashicons-wpdev-clock wpdev-mr-1 wpdev-align-middle"></span>{{ $moment(event.date_created, "YYYYMMDD").fromNow() }}</span>
                        <span v-if="event.author.display_name" class="wpdev-text-gray-700"><?php printf(__('by %s', 'wpdev'), '{{ event.author.display_name }}'); ?></span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="wpdev-ml-auto wpdev-flex-shrink-0">
                <svg class="wpdev-h-5 wpdev-w-5 wpdev-text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </a>
        </li>

      </ul>

      <div v-cloak class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">

        <ul
          v-if='!loading'
          class='wpdev-feed-pagination wpdev-m-0 wpdev-flex wpdev-justify-between'>
          <li class="wpdev-w-1/3 wpdev-m-0">
            <a href="#" class="wpdev-block" v-on:click.prevent="refresh">
              <?php _e('Refresh', 'wpdev'); ?>
            </a>
          </li>
          <li v-if="page > 1" class="wpdev-w-1/3 wpdev-text-center wpdev-m-0">
            <a href="#" v-on:click.prevent="navigatePrev" class="wpdev-block">
              &larr; <?php _e('Previous Page', 'wpdev'); ?>
            </a>
          </li>
          <li v-if="hasMore() && !loading" class="wpdev-w-1/3 wpdev-text-right wpdev-m-0">
            <a href="#" v-on:click.prevent="navigateNext" class="wpdev-block">
              <?php _e('Next Page', 'wpdev'); ?>
              &rarr;
            </a>
          </li>
        </ul>

      </div>

    </div>

  </div>

</div>

<script type="application/javascript">
  document.addEventListener('DOMContentLoaded', function() {

    Object.defineProperty(Vue.prototype, '$moment', {
      value: wpdev_moment
    });

    var wuActivityStream = new Vue({
      el: '#activity-stream-content',
      data: {
        count: 0,
        loading: true,
        page: 1,
        queried: [],
        error: false,
        errorMessage: "",
      },
      mounted: function() {
        this.pullQuery();
      },
      watch: {
        queried: function(value) {},
      },
      methods: {
        hasMore: function() {
          return this.queried.count > (this.page * 5)
        },
        refresh: function() {
          this.loading = true;
          this.pullQuery();
        },
        navigatePrev: function() {
          this.page = this.page <= 1 ? 1 : this.page - 1;
          this.loading = true;
          this.pullQuery();
        },
        navigateNext: function() {
          this.page = this.page + 1;
          this.loading = true;
          this.pullQuery();
        },
        pullQuery: function() {
          var that = this;
          jQuery.ajax({
            url: ajaxurl,
            data: {
              _ajax_nonce: '<?php echo esc_js(wp_create_nonce('wpdev_activity_stream')); ?>',
              action: 'wpdev_fetch_activity',
              page: this.page,
            },
            success: function(data) {
              that.loading = false;
              Vue.set(wuActivityStream, 'loading', false);

              if (data.success) {

                Vue.set(wuActivityStream, 'queried', data.data);

              } // end if;

            },
          })

        },
        get_color_event: function(type) {},
      }
    });

  });
</script>
