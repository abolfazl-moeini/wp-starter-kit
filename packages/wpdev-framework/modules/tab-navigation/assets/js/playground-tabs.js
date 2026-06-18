/**
 * Tab navigation playground async panel loader.
 *
 * @package WPDevFramework\Modules\TabNavigation
 * @since   2.7.0
 */
(function () {
	'use strict';

	function initAsyncPanel(host) {
		if (!host || host.getAttribute('data-wpdev-pg-tabs-init') === '1') {
			return;
		}

		host.setAttribute('data-wpdev-pg-tabs-init', '1');

		var loading = host.querySelector('.wpdev-pg-tab-loading');
		var body = host.querySelector('.wpdev-pg-tab-async-body');
		var err = host.querySelector('.wpdev-pg-tab-error');
		var baseUrl = host.getAttribute('data-ajax-url') || '';

		function loadTab(tab) {
			var url = baseUrl;

			if (!url) {
				if (err) {
					err.textContent = 'Ajax tab URL unavailable.';
					err.style.display = 'block';
				}
				if (loading) {
					loading.style.display = 'none';
				}
				return;
			}

			url = url.replace(/tab=[^&]+/, 'tab=' + encodeURIComponent(tab || 'metrics'));
			if (url.indexOf('tab=') === -1) {
				url += (url.indexOf('?') > -1 ? '&' : '?') + 'tab=' + encodeURIComponent(tab || 'metrics');
			}

			if (loading) {
				loading.style.display = 'block';
			}
			if (body) {
				body.style.display = 'none';
				body.innerHTML = '';
			}
			if (err) {
				err.style.display = 'none';
			}

			fetch(url, { credentials: 'same-origin' })
				.then(function (response) {
					return response.json();
				})
				.then(function (res) {
					if (loading) {
						loading.style.display = 'none';
					}
					if (res.success && res.data && res.data.html && body) {
						body.innerHTML = res.data.html;
						body.style.display = 'block';
						return;
					}
					if (res.success && body) {
						body.innerHTML = '<pre>' + JSON.stringify(res, null, 2) + '</pre>';
						body.style.display = 'block';
						return;
					}
					throw new Error((res.data && res.data.message) || 'Request failed');
				})
				.catch(function (e) {
					if (loading) {
						loading.style.display = 'none';
					}
					if (err) {
						err.textContent = String(e.message || e);
						err.style.display = 'block';
					}
				});
		}

		loadTab('metrics');

		var reload = document.getElementById('wpdev-pg-tab-reload');
		var fail = document.getElementById('wpdev-pg-tab-error-demo');

		if (reload) {
			reload.addEventListener('click', function () {
				loadTab('metrics');
			});
		}

		if (fail) {
			fail.addEventListener('click', function () {
				loadTab('error');
			});
		}
	}

	function boot() {
		var host = document.getElementById('wpdev-pg-tab-async-panel');
		initAsyncPanel(host);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
