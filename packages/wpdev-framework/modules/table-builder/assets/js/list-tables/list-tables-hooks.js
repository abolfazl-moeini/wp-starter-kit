/* eslint-disable no-undef */
(function($, hooks) {

  /**
   * Fixes the value of the action for deleting pending sites.
   */
  hooks.addAction('wpdev_list_table_update', 'wpdev', function(results, data, $parent) {

    if (results.type === 'pending' && data.table_id === 'site_list_table') {

      $parent.find('select[name^=action] > option[value=delete]').attr('value', 'delete-pending');

    } else {

      $parent.find('select[name^=action] > option[value=delete-pending]').attr('value', 'delete');

    } // end if;

  });

}(jQuery, wp.hooks));
