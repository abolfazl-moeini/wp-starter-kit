<?php
/**
 * Filter view.
 *
 * @since 2.0.0
 */
?>
<div id="dashboard-filters" class="wp-filter wpdev-filter">

	<ul class="filter-links">

		<?php foreach ($views as $tab => $view) : ?>

			<li class="<?php echo $tab === $active_tab ? 'current' : ''; ?>">
				<a href="<?php echo esc_attr($view['url']); ?>"
				   class="<?php echo $tab === $active_tab ? 'current wpdev-font-medium' : ''; ?> wpdev-loader">
					<?php echo $view['label']; ?>
				</a>
			</li>

		<?php endforeach; ?>

	</ul>

	<ul class="filter-links sm:wpdev-float-right sm:wpdev-w-1/2 lg:wpdev-w-1/4 wpdev--mx-2 wpdev-block sm:wpdev-inline-block">
		<li class="wpdev-w-full wpdev-relative">
			<span class="dashicons-wpdev-calendar wpdev-absolute wpdev-text-base wpdev-text-gray-600" style="top: 18px; left: 12px;"></span>
			<input
				id="wpdev-date-range"
				style="min-height: 28px;"
				class="wpdev-border-0 wpdev-border-l wpdev-border-gray-300 wpdev-bg-gray-100 wpdev-w-full wpdev-text-right wpdev-py-3 wpdev-outline-none wpdev-rounded-none"
				placeholder="Loading..."
			>
		</li>
	</ul>

	<ul class="wpdev-hidden md:wpdev-inline-block filter-links sm:wpdev-float-right md:wpdev-mr-6">

		<?php foreach ($preset_options as $slug => $preset) : ?>

			<?php

			$link = add_query_arg(array(
				'start_date' => $preset['start_date'],
				'end_date'   => $preset['end_date'],
				'preset'     => $slug,
			));

			$request_slug = wpdev_request('preset', 'none');

			?>

			<li class="<?php echo $slug === $request_slug ? 'current' : ''; ?>">
				<a href="<?php echo esc_attr($link); ?>"
				   class="<?php echo $slug === $request_slug ? 'current wpdev-font-medium' : ''; ?> wpdev-loader">
					<?php echo $preset['label']; ?>
				</a>
			</li>

		<?php endforeach; ?>

	</ul>

</div>
