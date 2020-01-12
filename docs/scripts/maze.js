function maze_load( evt ) {
	var LTByte = String.fromCharCode;

	var CONSTANTS = {};
	CONSTANTS[ "MAZE_WIDTH" ] = 4;
	CONSTANTS[ "MAZE_HEIGHT" ] = 4;
	CONSTANTS[ "BORDER_RATIO" ] = 0.2;
	CONSTANTS[ "IMG_RED_PLAYER" ] = new Image();
	CONSTANTS[ "IMG_BLUE_PLAYER" ] = new Image();
	CONSTANTS[ "IMG_RED_BULLET" ] = new Image();
	CONSTANTS[ "IMG_BLUE_BULLET" ] = new Image();

	CONSTANTS[ "OP_CREATE" ] = 0x00;
	CONSTANTS[ "OP_JOIN" ] = 0x01;
	CONSTANTS[ "OP_LEAVE" ] = 0x02;
	CONSTANTS[ "OP_CDOWN" ] = 0x03;
	CONSTANTS[ "OP_START" ] = 0x04;
	CONSTANTS[ "OP_POS" ] = 0x05;
	CONSTANTS[ "OP_SMOVE" ] = 0x06;
	CONSTANTS[ "OP_EMOVE" ] = 0x07;
	CONSTANTS[ "OP_SHOOT" ] = 0x08;
	CONSTANTS[ "OP_HEALTH" ] = 0x09;

	CONSTANTS[ "RESP_JOIN_SUCCESS" ] = 0x00;
	CONSTANTS[ "RESP_JOIN_NULLROOM" ] = 0x01;
	CONSTANTS[ "RESP_JOIN_FULLROOM" ] = 0x02;
	CONSTANTS[ "RESP_JOIN_STARTED" ] = 0x03;

	var GLOBALS = {};
	GLOBALS[ "render" ] = {};
	GLOBALS.render[ "canvas" ] = document.getElementById( "maze-canvas" );
	GLOBALS.render[ "canvas" ].width = window.innerWidth;
	GLOBALS.render[ "canvas" ].height = window.innerHeight;
	GLOBALS.render[ "ctx" ] = GLOBALS.render[ "canvas" ].getContext( "2d" );

	GLOBALS[ "maze" ] = {};
	GLOBALS.maze[ "cell_size" ] = Math.round( 1 / CONSTANTS[ "BORDER_RATIO" ] );
	GLOBALS.maze[ "canvas" ] = document.createElement( "canvas" );
	GLOBALS.maze[ "canvas" ].width = window.innerWidth;
	GLOBALS.maze[ "canvas" ].height = window.innerHeight;
	GLOBALS.maze[ "ctx" ] = GLOBALS.maze[ "canvas" ].getContext( "2d" );

	GLOBALS[ "room_created" ] = false;
	GLOBALS[ "host" ] = false;
	GLOBALS[ "ws" ] = null;
	GLOBALS[ "host_count" ] = 0;

	GLOBALS[ "rng" ] = {};
	GLOBALS.rng[ "seed" ] = -1;
	GLOBALS.rng[ "x" ] = -1;
	GLOBALS.rng[ "y" ] = -1;
	GLOBALS.rng[ "temp_x" ] = -1;
	GLOBALS.rng[ "temp_y" ] = -1;
	GLOBALS.rng[ "buffer" ] = -1;

	GLOBALS[ "game" ] = {};
	GLOBALS.game[ "bool_maze" ] = [];
	GLOBALS.game[ "maze_size" ] = -1;
	GLOBALS.game[ "chunk" ] = {}
	GLOBALS.game.chunk[ "canvas" ] = document.createElement( "canvas" );
	GLOBALS.game.chunk.canvas.width = 1792;
	GLOBALS.game.chunk.canvas.height = 1792;
	GLOBALS.game.chunk[ "ctx" ] = GLOBALS.game.chunk.canvas.getContext( "2d" );
	GLOBALS.game.me = 0;

	function LTUInt32( num ) {
		return ( num & 0xFFFFFFFF ) >>> 0;
	}

	function rng_set_seed( seed ) {
		GLOBALS.rng.seed = LTUInt32( seed );
		GLOBALS.rng.x = LTUInt32( seed << 1 );
		GLOBALS.rng.y = LTUInt32( seed >>> 1 );
		rng_next_buffer();
	}

	function rng_next_buffer() {
		GLOBALS.rng.temp_x = GLOBALS.rng.y;
		GLOBALS.rng.x ^= LTUInt32( GLOBALS.rng.x << 23 );
		GLOBALS.rng.temp_y = LTUInt32( GLOBALS.rng.x ^ GLOBALS.rng.y ^ ( GLOBALS.rng.x >> 17 ) ^ ( GLOBALS.rng.y >> 26 ) );
		GLOBALS.rng.buffer = LTUInt32( GLOBALS.rng.temp_y + GLOBALS.rng.y );
		GLOBALS.rng.x = GLOBALS.rng.temp_x;
		GLOBALS.rng.y = GLOBALS.rng.temp_y;
	}

	function rng_next_n_bits( n ) {
		var mask = 1;
		for( var i = 0; i < n - 1; ++i ) {
			mask = mask << 1;
			mask |= 0x1;
		}
		mask &= GLOBALS.rng.buffer;
		GLOBALS.rng.buffer = GLOBALS.rng.buffer >> n;
		if( GLOBALS.rng.buffer == 0 ) rng_next_buffer();
		return mask;
	}

	function generate_bool_maze() {
		var y, x, g = GLOBALS.game, b = 1, c = 5, s;
		s = g.maze_size * ( b + c ) + b;
		for( y = 0; y < s; ++y ) {
			g.bool_maze.push( [] );
			for( x = 0; x < s; ++x ) {
				g.bool_maze[ y ].push( true );
			}
		}
		var cx = b, cy = b, stk = [], v = false, d,
			dirs = [ [ 0, -b - c ], [ b + c, 0 ], [ 0, b + c ], [ -b - c, 0 ] ],
			offs = [ [ 0, 0 ], [ -b, 0 ], [ 0, -b ], [ 0, 0 ] ];
		stk.push( [ cx, cy ] );
		for( y = 0; y < c; ++y ) {
			for( x = 0; x < c; ++x ) {
				g.bool_maze[ y + cy ][ x + cx ] = false;
			}
		}
		while( stk.length > 0 ) {
			v = false;
			d = rng_next_n_bits( 2 );
			for( x = 0; x < 4; ++x ) {
				if( !v ) d = ( d + 1 ) % 4;
				if( !v && cx + dirs[ d ][ 0 ] > 0 && cx + dirs[ d ][ 0 ] < s ) {
					if( cy + dirs[ d ][ 1 ] > 0 && cy + dirs[ d ][ 1 ] < s ) {
						if( g.bool_maze[ cy + dirs[ d ][ 1 ] ][ cx + dirs[ d ][ 0 ] ] ) {
							v = true;
						}
					}
				}
			}
			if( v ) {
				cy += dirs[ d ][ 1 ];
				cx += dirs[ d ][ 0 ];
				for( y = 0; y < Math.max( c, Math.abs( dirs[ d ][ 1 ] ) ); ++y ) {
					for( x = 0; x < Math.max( c, Math.abs( dirs[ d ][ 0 ] ) ); ++x ) {
						g.bool_maze[ y + cy + offs[ d ][ 1 ] ][ x + cx + offs[ d ][ 0 ] ] = false;
					}
				}
				stk.push( [ cx, cy ] );
			} else {
				cx = stk.pop();
				cy = cx[ 1 ];
				cx = cx[ 0 ];
			}
		}
	}

	function render_pixel( pixels, x, y, ul_x, ul_y ) {
		var eff_x = x + ul_x, eff_y = y + ul_y, m = GLOBALS.game.bool_maze.length * 256;
		if( eff_x < 0 || eff_y + ul_y < 0 || eff_x > m || eff_y > m ) pixels[ y * 7168 + x * 4 + 3 ] = 0;
		else {
			var pixel_x = ( ( eff_x ) / 256 ) | 0, pixel_y = ( ( eff_y ) / 256 ) | 0;
			pixels[ y * 7168 + x * 4 + 3 ] = 255;
			if( GLOBALS.game.bool_maze[ pixel_y ][ pixel_x ] ) {
				pixels[ y * 7168 + x * 4 ] = pixels[ y * 7168 + x * 4 + 1 ] = pixels[ y * 7168 + x * 4 + 2 ] = 10;
			} else {
				pixels[ y * 7168 + x * 4 ] = 46;
				pixels[ y * 7168 + x * 4 + 1 ] = 30;
				pixels[ y * 7168 + x * 4 + 2 ] = 33;		
			}
		}
	}

	function render_chunk( x, y ) {
		var data = GLOBALS.game.chunk.ctx.getImageData( 0, 0, 1792, 1792 ), pixels;
		pixels = data.data;
		var ul_y = y - 864, ul_x = x - 864, t_x, t_y;
		for( t_y = 0; t_y < 1792; ++t_y ) {
			for( t_x = 0; t_x < 1792; ++t_x ) {
				render_pixel( pixels, t_x, t_y, ul_x, ul_y );
			}
		}
		GLOBALS.game.chunk.ctx.putImageData( data, 0, 0, 0, 0, 1792, 1792 );
	}

	function game_loop( ticks ) {
		window.requestAnimationFrame( game_loop );
	}

	rng_set_seed( 2345953443 );
	GLOBALS.game.maze_size = 10;
	generate_bool_maze();
	
	function key_pressed( evt ) {
		switch( evt.keyCode ) {
			case 87:
				break;
			case 68:
				break;
			case 83:
				break;
			case 65:
				break;
		}
	}

	function key_released( evt ) {
		
	}

	document.addEventListener( "keydown", key_pressed, false );
	document.addEventListener( "keyup", key_released, false );
	document.body.appendChild( GLOBALS.game.chunk.canvas );

	window.requestAnimationFrame( game_loop );

	function set_pixel( data, x, y, r, g, b ) {
		var WIDTH = GLOBALS.maze.canvas.width,
			HEIGHT = GLOBALS.maze.canvas.height;
		data[ y * WIDTH * 4 + x * 4 ] = r;
		data[ y * WIDTH * 4 + x * 4 + 1 ] = g;
		data[ y * WIDTH * 4 + x * 4 + 2 ] = b;
		data[ y * WIDTH * 4 + x * 4 + 3 ] = 255;
	}

	function init_grid() {
		var m = GLOBALS.maze,
			WIDTH = GLOBALS.maze.canvas.width,
			HEIGHT = GLOBALS.maze.canvas.height,
			RATIO = CONSTANTS.BORDER_RATIO,
			DIRECTIONS = [],
			cell_size = 0,
			running = true,
			cell_stack = [],
			ctx = GLOBALS.maze.ctx;
		
		var border_size, maze_width, maze_height, left, top, y, x, cell_x, cell_y, offset_x, offset_y, direction, valid, d, data, pixels;	
		ctx.clearRect( 0, 0, WIDTH, HEIGHT );
		pixels = ctx.getImageData( 0, 0, WIDTH, HEIGHT );
		data = pixels.data;
		while( running ) {
			cell_size += m.cell_size;
			border_size = Math.round( cell_size * RATIO );
			if( ( ( cell_size + border_size ) * CONSTANTS.MAZE_WIDTH + border_size ) > WIDTH ) { running = false };
			if( ( ( cell_size + border_size ) * CONSTANTS.MAZE_HEIGHT + border_size ) > HEIGHT ) { running = false };		
		}
		cell_size -= m.cell_size;
		border_size = Math.round( cell_size * RATIO );
		DIRECTIONS.push( [ 0, -cell_size - border_size ] );
		DIRECTIONS.push( [ cell_size + border_size, 0 ] );
		DIRECTIONS.push( [ 0, cell_size + border_size ] );
		DIRECTIONS.push( [ -cell_size - border_size, 0 ] );
		maze_width = ( ( cell_size + border_size ) * CONSTANTS.MAZE_WIDTH + border_size );
		maze_height = ( ( cell_size + border_size ) * CONSTANTS.MAZE_HEIGHT + border_size );	
		left = ( ( ( WIDTH - maze_width ) | 0 ) / 2 ) | 0;
		top = ( ( ( HEIGHT - maze_height ) | 0 ) / 2 ) | 0;

		for( y = 0; y < maze_height; y++ ) for( x = 0; x < maze_width; x++ ) set_pixel( data, x + left, y + top, 10, 10, 10 );
		
		cell_x = border_size;
		cell_y = border_size;
		cell_stack.push( [ cell_x, cell_y ] );

		for( y = 0; y < cell_size; ++y ) for( x = 0; x < cell_size; ++x ) set_pixel( data, x + left + cell_x, y + top + cell_y, 46, 30, 33 );

		while( cell_stack.length > 0 ) {
			valid = false;
			d = ( Math.random() * 4 ) | 0;
			for( x = 0; x < 4; x++ ) {
				if( !valid ) d = ( d + 1 ) % 4;
				direction = DIRECTIONS[ d ];
				if( cell_x + direction[ 0 ] < maze_width && cell_x + direction[ 0 ] > 0 ) if( cell_y + direction[ 1 ] < maze_height && cell_y + direction[ 1 ] > 0 ) if( data[ ( top + cell_y + direction[ 1 ] ) * WIDTH * 4 + ( left + cell_x + direction[ 0 ] ) * 4 ] != 46 ) valid = true;
			}
			if( valid ) {
				offset_x = offset_y = 0;
				if( direction[ 0 ] > 0 ) offset_x = -border_size;
				else if( direction[ 1 ] > 0 ) offset_y = -border_size;
				cell_x += direction[ 0 ];
				cell_y += direction[ 1 ];
				for( y = 0; y < Math.max( cell_size, Math.abs( direction[ 1 ] ) ); ++y ) for( x = 0; x < Math.max( cell_size, Math.abs( direction[ 0 ] ) ); ++x ) set_pixel( data, x + left + cell_x + offset_x, y + top + cell_y + offset_y, 46, 30, 33 );
				cell_stack.push( [ cell_x, cell_y ] );
			} else {
				cell_x = cell_stack.pop();
				cell_y = cell_x[ 1 ];
				cell_x = cell_x[ 0 ];
			}
		}

		ctx.putImageData( pixels, 0, 0, 0, 0, WIDTH, HEIGHT );
		GLOBALS.render.ctx.clearRect( 0, 0, WIDTH, HEIGHT );
		GLOBALS.render.ctx.drawImage( GLOBALS.maze.canvas, 0, 0, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT );
	}

	init_grid();

	GLOBALS[ "keep_alive_interval" ] = null;

	function keep_alive_interval() {
		GLOBALS.ws.send( LTByte( CONSTANTS.OP_POS ) );
		console.log( "keep_alive" );
	}

	function demo_interval() {
		if( !GLOBALS.room_created ) {
			CONSTANTS.MAZE_WIDTH = ( CONSTANTS.MAZE_WIDTH + 1 ) % 47;
			CONSTANTS.MAZE_HEIGHT = ( CONSTANTS.MAZE_HEIGHT + 1 ) % 47;
			if( CONSTANTS.MAZE_WIDTH == 0 ) CONSTANTS.MAZE_WIDTH = 4;
			if( CONSTANTS.MAZE_HEIGHT == 0 ) CONSTANTS.MAZE_HEIGHT = 4;
			init_grid();
		} else {
			clearInterval( GLOBALS.demo_interval );
		}
	}

	GLOBALS[ "demo_interval" ] = setInterval( demo_interval, 750 );
	GLOBALS.keep_alive_interval = setInterval( keep_alive_interval, 5000 );

	var demo_room = document.getElementById( "maze" ),
		create_room_button = document.getElementById( "create-room-button" ),
		waiting_room_button = document.getElementById( "waiting-room-button" ),
		room_creation = document.getElementById( "room" ),
		waiting_room = document.getElementById( "waiting" ),
		red_vs = document.getElementById( "red-vs" ),
		blue_vs = document.getElementById( "blue-vs" );

	function create_room_pressed( evt ) {
		GLOBALS.ws.send( LTByte( CONSTANTS.OP_CREATE ) );
	}

	function create_room_received() {
		GLOBALS.host = true;
		GLOBALS.room_created = true;
		clearInterval( GLOBALS.demo_interval );
		room_creation.setAttribute( "class", "hidden" );
		waiting_room.setAttribute( "class", "visible" );
		CONSTANTS.MAZE_HEIGHT = 1;
		CONSTANTS.MAZE_WIDTH = 1;
		init_grid();
	}

	create_room_button.addEventListener( "click", create_room_pressed );
	create_room_button.addEventListener( "touchstart", create_room_pressed );

	function update_room() {
		var rcl = [], bcl = [], rc, bc, fn, ns;
		rc = Math.round( GLOBALS.host_count / 2 );
		bc = ( GLOBALS.host_count / 2 ) | 0;
		rcl.push( ( ( rc / 100 ) | 0 ).toString() );
		rcl.push( ( ( ( rc / 10 ) | 0 ) % 10 ).toString() );
		rcl.push( ( rc % 10 ).toString() );
		bcl.push( ( ( bc / 100 ) | 0 ).toString() );
		bcl.push( ( ( ( bc / 10 ) | 0 ) % 10 ).toString() );
		bcl.push( ( bc % 10 ).toString() );
		red_vs.innerHTML = rcl.join( "" );
		blue_vs.innerHTML = bcl.join( "" );
		fn = GLOBALS.host_count * 5;
		for( ns = 1; fn > ns * ns; ++ns );
		if( CONSTANTS.MAZE_WIDTH != ns ) {
			CONSTANTS.MAZE_HEIGHT = ns;
			CONSTANTS.MAZE_WIDTH = ns;
			init_grid();
		}
		if( GLOBALS.host_count >= 2 ) {
			waiting_room_button.setAttribute( "class", "visible" );
		} else {
			waiting_room_button.setAttribute( "class", "hidden" );
		}
	}

	function ws_open() {
		this.send( LTByte( CONSTANTS.OP_JOIN ) );
	}

	function ws_close() {

	}

	function ws_msg( data ) {
		var msg = data.data, op;
		op = msg.charCodeAt( 0 );
		switch( op ) {
			case CONSTANTS.OP_CREATE:
				create_room_received();
				break;
			case CONSTANTS.OP_JOIN:
				switch( msg.charCodeAt( 1 ) ) {
					case CONSTANTS.RESP_JOIN_SUCCESS:
						GLOBALS.room_created = true;
						if( GLOBALS.host ) {
							++GLOBALS.host_count;
							update_room();
						}
						break;
					case CONSTANTS.RESP_JOIN_NULLROOM:
						//demo_room.setAttribute( "class", "visible" );
						//room_creation.setAttribute( "class", "visible" );
						break;
					case CONSTANTS.RESP_JOIN_STARTED:
						GLOBALS.room_created = true;
						break;
					case CONSTANTS.RESP_JOIN_FULLROOM:
						GLOBALS.room_created = true;
						break;
				}
				break;
			case CONSTANTS.OP_LEAVE:
				if( GLOBALS.host ) {
					--GLOBALS.host_count;
					update_room();
				}
				break;
			case CONSTANTS.OP_CDOWN:
				break;
			case CONSTANTS.OP_START:
				break;
			case CONSTANTS.OP_POS:
				break;
			case CONSTANTS.OP_SMOVE:
				break;
			case CONSTANTS.OP_EMOVE:
				break;
			case CONSTANTS.OP_SHOOT:
				break;
			case CONSTANTS.OP_HEALTH:
				break;
		}
		console.log( msg );
	}

	GLOBALS.ws = new WebSocket( "wss://labyrintech.herokuapp.com" );
	GLOBALS.ws.onopen = ws_open;
	GLOBALS.ws.onclose = ws_close;
	GLOBALS.ws.onmessage = ws_msg;
}

window.addEventListener( "load", maze_load );