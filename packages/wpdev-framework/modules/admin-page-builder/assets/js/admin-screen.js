/* eslint-disable max-len */
/* global wpdev_admin_screen, wpdev_block_ui */
(function($) {

  $(document).ready(function() {

    $('body').on('click', '#wpdev-admin-screen-customize', function() {

      wpdev_block_ui('#wpcontent');

    });

    const is_edit_mode = $('body').hasClass('wpdev-customize-admin-screen');

    let $elem = `<a id="wpdev-admin-screen-customize" href="${ wpdev_admin_screen.customize_link }" class="button show-settings">${ wpdev_admin_screen.i18n.customize_label }</button>`;

    const $page_elem = `<a title="${ wpdev_admin_screen.i18n.page_customize_label }" id="wpdev-admin-screen-page-customize" href="${ wpdev_admin_screen.page_customize_link }" class="wubox button show-settings">${ wpdev_admin_screen.i18n.page_customize_label }</button>`;

    if (is_edit_mode) {

      $elem = `<a id="wpdev-admin-screen-customize" href="${ wpdev_admin_screen.close_link }" class="button show-settings wpdev-font-medium"><span class="wpdev-text-sm wpdev-align-text-bottom wpdev-text-red-500 wpdev-mr-2 wpdev--ml-1 dashicons-wpdev-circle-with-cross"></span>${ wpdev_admin_screen.i18n.close_label }</button>`;

    } else {

      $($page_elem).prependTo('#screen-options-link-wrap');

    } // end if;

    $($elem).appendTo('#screen-options-link-wrap');

  });

}(jQuery));
