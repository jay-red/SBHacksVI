function maze_load( evt ) {
	var CONSTANTS = {};

	CONSTANTS[ "MAZE_WIDTH" ] = 4;
	CONSTANTS[ "MAZE_HEIGHT" ] = 4;
	CONSTANTS[ "BORDER_RATIO" ] = 0.2;
	CONSTANTS[ "IMG_RED_PLAYER" ] = new Image();
	CONSTANTS[ "IMG_BLUE_PLAYER" ] = new Image();
	CONSTANTS[ "IMG_RED_BULLET" ] = new Image();
	CONSTANTS[ "IMG_BLUE_BULLET" ] = new Image();

	var GLOBALS = {};
	GLOBALS[ "render" ] = {};
	GLOBALS[ "render" ][ "canvas" ] = document.getElementById( "maze-canvas" );
	GLOBALS[ "render" ][ "canvas" ].width = window.innerWidth;
	GLOBALS[ "render" ][ "canvas" ].height = window.innerHeight;
	GLOBALS[ "render" ][ "ctx" ] = GLOBALS[ "render" ][ "canvas" ].getContext( "2d" );

	GLOBALS[ "maze" ] = {};
	GLOBALS[ "maze" ][ "cell_size" ] = Math.round( 1 / CONSTANTS[ "BORDER_RATIO" ] );
	GLOBALS[ "maze" ][ "canvas" ] = document.createElement( "canvas" );
	GLOBALS[ "maze" ][ "canvas" ].width = window.innerWidth;
	GLOBALS[ "maze" ][ "canvas" ].height = window.innerHeight;
	GLOBALS[ "maze" ][ "ctx" ] = GLOBALS[ "maze" ][ "canvas" ].getContext( "2d" );

	function set_pixel( data, x, y, r, g, b ) {
		var WIDTH = GLOBALS[ "maze" ][ "canvas" ].width,
			HEIGHT = GLOBALS[ "maze" ][ "canvas" ].height;
		data[ y * WIDTH * 4 + x * 4 ] = r;
		data[ y * WIDTH * 4 + x * 4 + 1 ] = g;
		data[ y * WIDTH * 4 + x * 4 + 2 ] = b;
		data[ y * WIDTH * 4 + x * 4 + 3 ] = 255;
	}

	function init_grid() {
		var m = GLOBALS[ "maze" ],
			WIDTH = GLOBALS[ "maze" ][ "canvas" ].width,
			HEIGHT = GLOBALS[ "maze" ][ "canvas" ].height,
			RATIO = CONSTANTS[ "BORDER_RATIO" ],
			DIRECTIONS = [],
			cell_size = 0,
			running = true,
			cell_stack = [],
			ctx = GLOBALS[ "maze" ][ "ctx" ];
		
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
		GLOBALS[ "render" ][ "ctx" ].clearRect( 0, 0, WIDTH, HEIGHT );
		GLOBALS[ "render" ][ "ctx" ].drawImage( GLOBALS[ "maze" ][ "canvas" ], 0, 0, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT );
	}

	init_grid();

	function demo_interval() {
		CONSTANTS[ "MAZE_WIDTH" ] = ( CONSTANTS[ "MAZE_WIDTH" ] + 1 ) % 47;
		CONSTANTS[ "MAZE_HEIGHT" ] = ( CONSTANTS[ "MAZE_HEIGHT" ] + 1 ) % 47;
		if( CONSTANTS[ "MAZE_WIDTH" ] == 0 ) CONSTANTS[ "MAZE_WIDTH" ] = 4;
		if( CONSTANTS[ "MAZE_HEIGHT" ] == 0 ) CONSTANTS[ "MAZE_HEIGHT" ] = 4;
		init_grid();
	}

	GLOBALS[ "demo_interval" ] = setInterval( demo_interval, 750 );


	var create_room_button = document.getElementById( "create-room-button" ),
		waiting_room_button = document.getElementById( "waiting-room-button" ),
		room_creation = document.getElementById( "room" ),
		waiting_room = document.getElementById( "waiting" );

	function create_room_pressed( evt ) {
		clearInterval( GLOBALS[ "demo_interval" ] );
		room_creation.setAttribute( "class", "hidden" );
		waiting_room.setAttribute( "class", "visible" );
		CONSTANTS[ "MAZE_WIDTH" ] = 1;
		CONSTANTS[ "MAZE_HEIGHT" ] = 1;
		init_grid();
	}

	create_room_button.addEventListener( "click", create_room_pressed );
	create_room_button.addEventListener( "touchstart", create_room_pressed );
}

window.addEventListener( "load", maze_load );