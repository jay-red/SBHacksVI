function maze_load( evt ) {
	var CONSTANTS = {};

	CONSTANTS[ "MAZE_WIDTH" ] = 10;
	CONSTANTS[ "MAZE_HEIGHT" ] = 10;
	CONSTANTS[ "BORDER_RATIO" ] = 0.2;

	var GLOBALS = {};
	GLOBALS[ "render" ] = {};
	GLOBALS[ "render" ][ "canvas" ] = document.getElementById( "amazed-canvas" );
	GLOBALS[ "render" ][ "canvas" ].width = window.innerWidth;
	GLOBALS[ "render" ][ "canvas" ].height = window.innerHeight;
	GLOBALS[ "render" ][ "ctx" ] = GLOBALS[ "render" ][ "canvas" ].getContext( "2d" );

	GLOBALS[ "maze" ] = {};
	GLOBALS[ "maze" ][ "cell_size" ] = Math.round( 1 / CONSTANTS[ "BORDER_RATIO" ] );
	GLOBALS[ "maze" ][ "canvas" ] = document.createElement( "canvas" );
	GLOBALS[ "maze" ][ "canvas" ].width = window.innerWidth;
	GLOBALS[ "maze" ][ "canvas" ].height = window.innerHeight;
	GLOBALS[ "maze" ][ "ctx" ] = GLOBALS[ "maze" ][ "canvas" ].getContext( "2d" );

	function init_grid() {
		var m = GLOBALS[ "maze" ],
			WIDTH = GLOBALS[ "maze" ][ "canvas" ].width,
			HEIGHT = GLOBALS[ "maze" ][ "canvas" ].height,
			RATIO = CONSTANTS[ "BORDER_RATIO" ],
			cell_size = 0,
			border_size,
			maze_width,
			maze_height,
			left,
			top,
			running = true,
			y,
			x,
			data,
			pixels,
			ctx = GLOBALS[ "maze" ][ "ctx" ]; 
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
		maze_width = ( ( cell_size + border_size ) * CONSTANTS.MAZE_WIDTH + border_size );
		maze_height = ( ( cell_size + border_size ) * CONSTANTS.MAZE_WIDTH + border_size );	
		left = ( ( ( WIDTH - maze_width ) | 0 ) / 2 ) | 0;
		top = ( ( ( HEIGHT - maze_height ) | 0 ) / 2 ) | 0;
		for( y = 0; y < maze_height; y++ ) {
			for( x = 0; x < maze_width; x++ ) {
				data[ ( y + top ) * WIDTH * 4 + ( x + left ) * 4 ] = 0;
				data[ ( y + top ) * WIDTH * 4 + ( x + left ) * 4 + 1 ] = 0;
				data[ ( y + top ) * WIDTH * 4 + ( x + left ) * 4 + 2 ] = 0;
				data[ ( y + top ) * WIDTH * 4 + ( x + left ) * 4 + 3 ] = 255;
			}
		}
		ctx.putImageData( pixels, 0, 0, 0, 0, WIDTH, HEIGHT );
		GLOBALS[ "render" ][ "ctx" ].drawImage( GLOBALS[ "maze" ][ "canvas" ], 0, 0, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT );
	}

	init_grid();
}

window.addEventListener( "load", maze_load );