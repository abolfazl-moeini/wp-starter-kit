<?php
/**
 * Graph base view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-mt-6 wpdev-mb-0">

  <div v-show="false" class="wpdev-text-center wpdev-rounded wpdev-flex wpdev-items-center wpdev-justify-center wpdev-uppercase wpdev-font-semibold wpdev-text-xs wpdev-h-full wpdev-text-gray-700" style="height: 300px;">

    <span class="wpdev-blinking-animation">

      <?php _e('Loading...', 'wpdev'); ?>

    </span>

  </div>

  <div id="chart_mrr_growth">
    <apexchart
      v-cloak
      height="300"
      :type="chart_options.mrr_growth.chartOptions.chart.type"
      :options="chart_options.mrr_growth.chartOptions"
      :series="chart_options.mrr_growth.series"
    >
    </apexchart>
  </div>

</div>

