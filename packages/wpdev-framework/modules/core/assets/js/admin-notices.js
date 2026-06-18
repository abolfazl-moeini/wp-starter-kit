(function($) {

  $(document).ready(function() {

    /**
     * Prevent notices from jumping around.
     */
    $('.notice.wpdev-hidden').removeClass('wpdev-hidden');

    /**
     * Dismisses a WPDev notice
     *
     * When a notice is dismissable, we save the key of that notice after the dismiss
     * button is clicked to avoid showing that notice again for that customer in the future.
     */
    $('.notice.wpdev-admin-notice').on('click', '.notice-dismiss', function(e) {

      e.preventDefault();

      const $this = $(this);

      const $notice = $this.parents('.notice');

      if ($notice.find('[name="notice_id"]').val()) {

        $.ajax({
          method: 'post',
          // eslint-disable-next-line no-undef
          url: ajaxurl,
          data: {
            action: 'wpdev_dismiss_admin_notice',
            nonce: $notice.find('[name="nonce"]').val(),
            notice_id: $notice.find('[name="notice_id"]').val(),
          },
        });

      } // end if;

    });

  });

}(jQuery));
