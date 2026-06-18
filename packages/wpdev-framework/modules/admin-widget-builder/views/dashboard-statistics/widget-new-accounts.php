<?php
/**
 * Total widget view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling">

	<ul class="md:wpdev-flex wpdev-my-0 wpdev-mx-0">

		<li class="wpdev-p-2 wpdev-w-full md:wpdev-w-full wpdev-relative">

			<div>

				<strong class="wpdev-text-gray-800 wpdev-text-2xl md:wpdev-text-xl">
					<?php echo $new_accounts; ?>
				</strong>

			</div>

			<div class="wpdev-text-sm wpdev-text-gray-600">
				<span class="wpdev-block"><?php _e('New Memberships', 'wpdev'); ?></span>
			</div>

		</li>

	</ul>

	<div class="wpdev--mx-3 wpdev--mb-3 wpdev-mt-2">


		<table class="wp-list-table widefat fixed striped wpdev-border-t-1 wpdev-border-l-0 wpdev-border-r-0">

			<thead>
			<tr>
				<th><?php _e('Product Name', 'wpdev'); ?></th>
				<th class="wpdev-text-right"><?php _e('New Memberships', 'wpdev'); ?></th>
			</tr>
			</thead>

			<tbody>

			<?php if ($products) : ?>

				<?php foreach ($products as $product) : ?>

					<tr>
						<td>
							<?php echo $product->name; ?>
						</td>
						<td class="wpdev-text-right">
							<?php echo $product->count; ?>
						</td>
					</tr>

				<?php endforeach; ?>

			<?php else : ?>

				<tr>
					<td colspan="2">
						<?php _e('No Products found.', 'wpdev'); ?>
					</td>
				</tr>

			<?php endif; ?>

			</tbody>

		</table>

	</div>

</div>
