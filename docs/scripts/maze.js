function maze_load( evt ) {
	var CONSTANTS = {};

	CONSTANTS[ "MAZE_WIDTH" ] = 4;
	CONSTANTS[ "MAZE_HEIGHT" ] = 4;
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
			DIRECTIONS = [],
			cell_size = 0,
			border_size,
			maze_width,
			maze_height,
			left,
			top,
			running = true,
			y,
			x,
			cell_x,
			cell_y,
			offset_x,
			offset_y,
			direction,
			valid,
			d,
			cell_stack = [],
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
		DIRECTIONS.push( [ 0, -cell_size - border_size ] );
		DIRECTIONS.push( [ cell_size + border_size, 0 ] );
		DIRECTIONS.push( [ 0, cell_size + border_size ] );
		DIRECTIONS.push( [ -cell_size - border_size, 0 ] );
		maze_width = ( ( cell_size + border_size ) * CONSTANTS.MAZE_WIDTH + border_size );
		maze_height = ( ( cell_size + border_size ) * CONSTANTS.MAZE_HEIGHT + border_size );	
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
		
		cell_x = border_size;
		cell_y = border_size;
		cell_stack.push( [ cell_x, cell_y ] );

		for( y = 0; y < cell_size; ++y ) {
			for( x = 0; x < cell_size; ++x ) {
				data[ ( y + top + cell_y ) * WIDTH * 4 + ( x + left + cell_x ) * 4 ] = 255;
				data[ ( y + top + cell_y ) * WIDTH * 4 + ( x + left + cell_x ) * 4 + 1 ] = 255;
				data[ ( y + top + cell_y ) * WIDTH * 4 + ( x + left + cell_x ) * 4 + 2 ] = 255;
				data[ ( y + top + cell_y ) * WIDTH * 4 + ( x + left + cell_x ) * 4 + 3 ] = 255;
			}
		}

		while( cell_stack.length > 0 ) {
			d = ( Math.random() * 4 ) | 0;
			direction = DIRECTIONS[ d ];
			valid = false;
			if( cell_x + direction[ 0 ] < maze_width && cell_x + direction[ 0 ] > 0 ) {
				if( cell_y + direction[ 1 ] < maze_height && cell_y + direction[ 1 ] > 0 ) {
					if( data[ ( top + cell_y + direction[ 1 ] ) * WIDTH * 4 + ( left + cell_x + direction[ 0 ] ) * 4 ] != 255 ) {
						valid = true;
					}
				}
			}
			if( !valid ) d = ( d + 1 ) % 4;
			direction = DIRECTIONS[ d ];
			if( !valid && cell_x + direction[ 0 ] < maze_width && cell_x + direction[ 0 ] > 0 ) {
				if( cell_y + direction[ 1 ] < maze_height && cell_y + direction[ 1 ] > 0 ) {
					if( data[ ( top + cell_y + direction[ 1 ] ) * WIDTH * 4 + ( left + cell_x + direction[ 0 ] ) * 4 ] != 255 ) {
						valid = true;
					}
				}
			}
			if( !valid ) d = ( d + 1 ) % 4;
			direction = DIRECTIONS[ d ];
			if( !valid && cell_x + direction[ 0 ] < maze_width && cell_x + direction[ 0 ] > 0 ) {
				if( cell_y + direction[ 1 ] < maze_height && cell_y + direction[ 1 ] > 0 ) {
					if( data[ ( top + cell_y + direction[ 1 ] ) * WIDTH * 4 + ( left + cell_x + direction[ 0 ] ) * 4 ] != 255 ) {
						valid = true;
					}
				}
			}
			if( !valid ) d = ( d + 1 ) % 4;
			direction = DIRECTIONS[ d ];
			if( !valid && cell_x + direction[ 0 ] < maze_width && cell_x + direction[ 0 ] > 0 ) {
				if( cell_y + direction[ 1 ] < maze_height && cell_y + direction[ 1 ] > 0 ) {
					if( data[ ( top + cell_y + direction[ 1 ] ) * WIDTH * 4 + ( left + cell_x + direction[ 0 ] ) * 4 ] != 255 ) {
						valid = true;
					}
				}
			}
			if( valid ) {
				offset_x = offset_y = 0;
				if( direction[ 0 ] > 0 ) {
					offset_x = -border_size;
				} else if( direction[ 1 ] > 0 ) {
					offset_y = -border_size;
				}
				cell_x += direction[ 0 ];
				cell_y += direction[ 1 ];
				for( y = 0; y < Math.max( cell_size, Math.abs( direction[ 1 ] ) ); ++y ) {
					for( x = 0; x < Math.max( cell_size, Math.abs( direction[ 0 ] ) ); ++x ) {
						data[ ( y + top + cell_y + offset_y ) * WIDTH * 4 + ( x + left + cell_x + offset_x ) * 4 ] = 255;
						data[ ( y + top + cell_y + offset_y ) * WIDTH * 4 + ( x + left + cell_x + offset_x ) * 4 + 1 ] = 255;
						data[ ( y + top + cell_y + offset_y ) * WIDTH * 4 + ( x + left + cell_x + offset_x ) * 4 + 2 ] = 255;
						data[ ( y + top + cell_y + offset_y ) * WIDTH * 4 + ( x + left + cell_x + offset_x ) * 4 + 3 ] = 255;
					}
				}
				cell_stack.push( [ cell_x, cell_y ] );
			} else {
				cell_x = cell_stack.pop();
				cell_y = cell_x[ 1 ];
				cell_x = cell_x[ 0 ];
			}
		}

		/*for( y = 0; y < cell_size + border_size; ++y ) {
			for( x = 0; x < cell_size + border_size; ++x ) {
				
			}
		}*/
		ctx.putImageData( pixels, 0, 0, 0, 0, WIDTH, HEIGHT );
		GLOBALS[ "render" ][ "ctx" ].drawImage( GLOBALS[ "maze" ][ "canvas" ], 0, 0, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT );
	}

	init_grid();
}

window.addEventListener( "load", maze_load );