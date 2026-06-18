/* global Shepherd, _, wpdev_tours, wpdev_tours_vars */
(function($) {

  function markTourFinished(tourId) {

    if (!wpdev_tours_vars || !wpdev_tours_vars.ajaxurl) {
      return;
    }

    $.post(wpdev_tours_vars.ajaxurl, {
      action: 'wpdev_mark_tour_as_finished',
      tour_id: tourId,
      nonce: wpdev_tours_vars.nonce,
    });

  } // end markTourFinished;

  $(document).ready(function() {

    _.each(wpdev_tours, function(tour, tour_id) {

      window[tour_id] = new Shepherd.Tour({
        useModalOverlay: true,
        includeStyles: false,
        styleVariables: {
          arrowSize: 1.1,
        },
        defaultStepOptions: {
          classes: 'wpdev-p-2 wpdev-bg-white wpdev-shadow-sm wpdev-rounded wpdev-text-left wpdev-text-gray-700',
          scrollTo: {
            block: 'center',
            behavior: 'smooth',
          },
          tippyOptions: {
            zIndex: 999999,
            onCreate(instance) {

              instance.popper.classList.add('wpdev-styling');

              const elements = instance.popperChildren.content.children[0].children[0].children;

              if (elements[0].children[0]) {

                elements[0].children[0].classList.add('wpdev-p-2', 'wpdev-pb-0', 'wpdev-m-0', 'wpdev--mb-1', 'wpdev-text-gray-800');

              } // end if;

              elements[1].classList.add('wpdev-p-2');

              elements[2].classList.add('wpdev--mt-1', 'wpdev-p-2', 'wpdev-bg-gray-200', 'wpdev-rounded', 'wpdev-text-right');

            },
          },
        },
      });

      window[tour_id].on('complete', function() {

        markTourFinished(tour_id);

      });

      _.each(tour, function(step, step_index) {

        const last_step = (step_index + 1) === tour.length;

        const action_url = function(url, target = '_blank') {

          return () => {

            window.open(url, target);

          };

        };

        step.buttons = _.isArray(step.buttons) ? step.buttons : [];

        step.buttons = _.map(step.buttons, function(item) {

          item.action = action_url(item.url, item.target);

          return item;

        });

        window[tour_id].addStep({
          ...step,
          buttons: [
            ...step.buttons,
            {
              classes: 'button button-primary wpdev-text-xs sm:wpdev-normal-case',
              text: last_step ? wpdev_tours_vars.i18n.finish : wpdev_tours_vars.i18n.next,
              action: last_step ? window[tour_id].complete : window[tour_id].next,
            },
          ],
        });

      });

      window[tour_id].start();

    });

  });

}(jQuery));
