( function () {
	'use strict';

	function keyOf( input ) {
		var key = input.getAttribute( 'data-wpdev-sub' ) || '';
		return /^[a-z0-9_-]+$/.test( key ) ? key : '';
	}

	function readControl( input ) {
		if ( input.type === 'number' ) {
			var number = parseInt( input.value, 10 );
			return isFinite( number ) && number > 0 ? number : 0;
		}
		return input.value;
	}

	function syncRecord( root, asList ) {
		var hidden = root.querySelector( '[data-wpdev-advanced-store]' );
		if ( ! hidden ) {
			return;
		}
		if ( root.getAttribute( 'data-wpdev-advanced' ) === 'repeater' ) {
			var max = parseInt( root.getAttribute( 'data-wpdev-max' ) || '100', 10 );
			var rows = [].slice.call( root.querySelectorAll( '[data-wpdev-advanced-list] > [data-wpdev-advanced-row]' ) );
			if ( isFinite( max ) && max > 0 && rows.length > max ) {
				rows = rows.slice( 0, max );
			}
			hidden.value = JSON.stringify( rows.map( function ( row ) {
				var item = {};
				[].slice.call( row.querySelectorAll( '[data-wpdev-sub]' ) ).forEach( function ( input ) {
					var key = keyOf( input );
					if ( key ) {
						item[ key ] = readControl( input );
					}
				} );
				return item;
			} ) );
			return;
		}
		if ( root.getAttribute( 'data-wpdev-advanced' ) === 'relationship' ) {
			var limit = parseInt( root.getAttribute( 'data-wpdev-limit' ) || '20', 10 );
			var ids = [];
			[].slice.call( root.querySelectorAll( '[data-wpdev-rel-id]' ) ).forEach( function ( box ) {
				if ( ! box.checked ) {
					return;
				}
				var id = parseInt( box.getAttribute( 'data-wpdev-rel-id' ), 10 );
				if ( ! isFinite( id ) || id <= 0 || ids.indexOf( id ) !== -1 ) {
					return;
				}
				if ( ! isFinite( limit ) || ids.length < limit ) {
					ids.push( id );
				} else {
					box.checked = false;
				}
			} );
			hidden.value = JSON.stringify( ids );
			return;
		}
		var record = {};
		[].slice.call( root.querySelectorAll( '[data-wpdev-sub]' ) ).forEach( function ( input ) {
			var key = keyOf( input );
			if ( key ) {
				record[ key ] = readControl( input );
			}
		} );
		hidden.value = JSON.stringify( asList ? [ record ] : record );
	}

	function bind( root ) {
		if ( ! root || root.getAttribute( 'data-wpdev-advanced-bound' ) === '1' ) {
			return;
		}
		root.setAttribute( 'data-wpdev-advanced-bound', '1' );
		root.addEventListener( 'input', function () {
			syncRecord( root, false );
		} );
		root.addEventListener( 'change', function () {
			syncRecord( root, false );
		} );
		root.addEventListener( 'click', function ( event ) {
			var add = event.target.closest( '[data-wpdev-advanced-add]' );
			var remove = event.target.closest( '[data-wpdev-advanced-remove]' );
			var media = event.target.closest( '[data-wpdev-advanced-media]' );
			if ( add && root.contains( add ) ) {
				var template = root.querySelector( 'template[data-wpdev-advanced-prototype]' );
				var list = root.querySelector( '[data-wpdev-advanced-list]' );
				var max = parseInt( root.getAttribute( 'data-wpdev-max' ) || '100', 10 );
				if ( ! template || ! list || ! template.content || ! template.content.firstElementChild ) {
					return;
				}
				if ( list.querySelectorAll( '[data-wpdev-advanced-row]' ).length >= max ) {
					return;
				}
				list.appendChild( template.content.firstElementChild.cloneNode( true ) );
				syncRecord( root, false );
				return;
			}
			if ( remove && root.contains( remove ) ) {
				var row = remove.closest( '[data-wpdev-advanced-row]' );
				if ( row ) {
					row.remove();
					syncRecord( root, false );
				}
				return;
			}
			if ( media && root.contains( media ) && window.wp && window.wp.media ) {
				var input = media.parentNode.querySelector( '[data-wpdev-sub]' );
				var frame = window.wp.media( { multiple: false } );
				frame.on( 'select', function () {
					var attachment = frame.state().get( 'selection' ).first();
					if ( input && attachment && attachment.id ) {
						input.value = String( attachment.id );
						syncRecord( root, false );
					}
				} );
				frame.open();
			}
		} );
	}

	function boot( scope ) {
		var root = scope && scope.querySelectorAll ? scope : document;
		[].slice.call( root.querySelectorAll( '[data-wpdev-advanced]' ) ).forEach( bind );
	}

	var api = { boot: boot, syncRecord: syncRecord };
	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = api;
	} else if ( typeof document !== 'undefined' ) {
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', function () {
				boot( document );
			} );
		} else {
			boot( document );
		}
	}
}() );
