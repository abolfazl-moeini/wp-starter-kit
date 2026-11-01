const fs = require( 'node:fs' );
const path = require( 'node:path' );

let JSDOM;
try {
	JSDOM = require( 'jsdom' ).JSDOM;
} catch ( err ) {
	const parentDir = path.resolve( __dirname, '../../../' );
	try {
		const peers = fs.readdirSync( parentDir );
		for ( const peer of peers ) {
			const candidate = path.join( parentDir, peer, 'node_modules', 'jsdom' );
			try {
				JSDOM = require( candidate ).JSDOM;
				if ( JSDOM ) {
					break;
				}
			} catch ( ignored ) {}
		}
	} catch ( ignored ) {}

	if ( ! JSDOM ) {
		throw new Error( 'jsdom could not be located in any peer node_modules' );
	}
}

function installDOM() {
	const dom = new JSDOM( '<!DOCTYPE html><html><body></body></html>', {
		url: 'http://localhost/',
	} );

	const previous = {
		window: global.window,
		document: global.document,
		Event: global.Event,
		CustomEvent: global.CustomEvent,
	};

	global.window = dom.window;
	global.document = dom.window.document;
	global.Event = dom.window.Event;
	global.CustomEvent = dom.window.CustomEvent;

	return {
		dom,
		restore() {
			global.window = previous.window;
			global.document = previous.document;
			global.Event = previous.Event;
			global.CustomEvent = previous.CustomEvent;
		},
	};
}

module.exports = { installDOM };
