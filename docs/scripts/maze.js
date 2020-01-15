var DEBUG = true;

function maze_load( evt ) {
	var LTByte = String.fromCharCode, loaded = 0;

	var CONSTANTS = {};
	CONSTANTS[ "MAZE_WIDTH" ] = 4;
	CONSTANTS[ "MAZE_HEIGHT" ] = 4;
	CONSTANTS[ "BORDER_RATIO" ] = 0.2;
	CONSTANTS[ "IMG_RED_PLAYER" ] = new Image();
	CONSTANTS[ "IMG_BLUE_PLAYER" ] = new Image();
	CONSTANTS[ "IMG_RED_BULLET" ] = new Image();
	CONSTANTS[ "IMG_BLUE_BULLET" ] = new Image();
	CONSTANTS[ "IMG_FLOOR" ] = new Image();

	function assets_loaded() {
		var i;

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

		CONSTANTS[ "PLAYER_VELOCITY" ] = 0.3;
		CONSTANTS[ "PROJECTILE_VELOCITY" ] = 0.9;
		CONSTANTS[ "ROTATION" ] = [];
		for( i = 0; i < 360; i++ ) {
			CONSTANTS.ROTATION.push( [ Math.cos( i / 180 * Math.PI ), Math.sin( i / 180 * Math.PI ) ] );
		}

		function Projectile( red, x, y, direction ) {
			this.active = true;
			this.red = red;
			this.direction = direction;
			this.x = x;
			this.y = y;
		}

		function update_projectile( p, ticks ) {
			var temp_ul_x = p.x, temp_ul_y = p.y;
			var temp_br_x, temp_br_y;
			var s = GLOBALS.game.bool_maze.length * 64;
			if( p.active ) {
				temp_ul_x += CONSTANTS.ROTATION[ p.direction ][ 0 ] * CONSTANTS.PROJECTILE_VELOCITY * ticks;
				temp_ul_y += CONSTANTS.ROTATION[ p.direction ][ 1 ] * CONSTANTS.PROJECTILE_VELOCITY * ticks;
				if( temp_ul_x < 0 || temp_ul_y < 0 || temp_ul_x + 32 > s || temp_ul_y + 32 > s ) {
					p.active = false;
					return;
				}
				if( GLOBALS.game.bool_maze[ ( temp_ul_y / 64 ) | 0 ][ ( temp_ul_x / 64 ) | 0 ] ) p.active = false;
				temp_br_x = temp_ul_x + 32;
				temp_br_y = temp_ul_y + 32;
				if( GLOBALS.game.bool_maze[ ( temp_br_y / 64 ) | 0 ][ ( temp_br_x / 64 ) | 0 ] ) p.active = false;
				p.x = temp_ul_x;
				p.y = temp_ul_y;
			}
		}

		function Player() {
			this.active = false;
			this.rotation = 0;
			this.direction = 0;
			this.x = -1;
			this.y = -1;
			this.health = 6;
			this.moving = false;
			this.last_moving = false;
			this.last_direction = -1;
			this.last_health = 6;
		}

		function update_player( p, ticks ) {
			if( p.health == 0 ) {
				p.active = false;
				return;
			}
			var temp_ul_x = p.x, temp_ul_y = p.y;
			var temp_ur_x, temp_br_y;
			var temp_br_x, temp_br_y;
			var temp_bl_x, temp_bl_y;
			if( p.active && p.moving ) {
				
				temp_ul_x += CONSTANTS.ROTATION[ p.direction ][ 0 ] * CONSTANTS.PLAYER_VELOCITY * ticks + 2;
				temp_ul_y += CONSTANTS.ROTATION[ p.direction ][ 1 ] * CONSTANTS.PLAYER_VELOCITY * ticks + 2;
				if( GLOBALS.game.bool_maze[ ( temp_ul_y / 64 ) | 0 ][ ( temp_ul_x / 64 ) | 0 ] ) return;
				temp_ur_x = temp_ul_x + 60;
				temp_ur_y = temp_ul_y;
				if( GLOBALS.game.bool_maze[ ( temp_ur_y / 64 ) | 0 ][ ( temp_ur_x / 64 ) | 0 ] ) return;
				temp_br_x = temp_ul_x + 60;
				temp_br_y = temp_ul_y + 60;
				if( GLOBALS.game.bool_maze[ ( temp_br_y / 64 ) | 0 ][ ( temp_br_x / 64 ) | 0 ] ) return;
				temp_bl_x = temp_ul_x;
				temp_bl_y = temp_ul_y + 60;
				if( GLOBALS.game.bool_maze[ ( temp_bl_y / 64 ) | 0 ][ ( temp_bl_x / 64 ) | 0 ] ) return;
				p.x = temp_ul_x - 2;
				p.y = temp_ul_y - 2;
			}
		}

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
		GLOBALS.game.chunk.canvas.width = 896;
		GLOBALS.game.chunk.canvas.height = 896;
		GLOBALS.game.chunk[ "ctx" ] = GLOBALS.game.chunk.canvas.getContext( "2d" );
		GLOBALS.game[ "me" ] = 0;
		GLOBALS.game[ "players" ] = [];
		GLOBALS.game[ "view" ] = {};
		GLOBALS.game.view[ "canvas" ] = document.getElementById( "game-canvas" );
		GLOBALS.game.view.canvas.width = 896;
		GLOBALS.game.view.canvas.height = Math.round( window.innerHeight / window.innerWidth * 896	 );
		GLOBALS.game.view[ "ctx" ] = GLOBALS.game.view.canvas.getContext( "2d" );
		GLOBALS.game[ "projectiles" ] = [];
		GLOBALS.game[ "hearts" ] = [ document.getElementById( "heart-one" ) ];
		GLOBALS.game[ "hearts" ].push( document.getElementById( "heart-two" ) );
		GLOBALS.game[ "hearts" ].push( document.getElementById( "heart-three" ) );
		for( i = 0; i < 512; i++ ) GLOBALS.game.players.push( new Player );

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
			var eff_x = x + ul_x, eff_y = y + ul_y, m = GLOBALS.game.bool_maze.length * 64;
			if( eff_x < 0 || eff_y < 0 || eff_x >= m || eff_y >= m ) pixels[ y * 3584 + x * 4 + 3 ] = 0;
			else {
				var pixel_x = ( ( eff_x ) / 64 ) | 0, pixel_y = ( ( eff_y ) / 64 ) | 0;
				pixels[ y * 3584 + x * 4 + 3 ] = 255;
				if( GLOBALS.game.bool_maze[ pixel_y ][ pixel_x ] ) {
					var off_x = eff_x % 64, off_y = eff_y % 64;
					if( off_x < 4 || off_y < 4 || off_x >= 60 || off_y >= 60 ) {
						pixels[ y * 3584 + x * 4 ] = 34;
						pixels[ y * 3584 + x * 4 + 1 ] = 34;
						pixels[ y * 3584 + x * 4 + 2 ] = 34;
					} else if( off_x < 8 || off_y < 8 || off_x >= 56 || off_y >= 56 ) {
						pixels[ y * 3584 + x * 4 ] = 211;
						pixels[ y * 3584 + x * 4 + 1 ] = 191;
						pixels[ y * 3584 + x * 4 + 2 ] = 169;
					} else {
						pixels[ y * 3584 + x * 4 ] = 170;
						pixels[ y * 3584 + x * 4 + 1 ] = 141;
						pixels[ y * 3584 + x * 4 + 2 ] = 122;
					}
				} else {
					var off_x = eff_x % 64, off_y = eff_y % 64;
					pixels[ y * 3584 + x * 4 ] = CONSTANTS.TILE[ off_y * 256 + off_x * 4 ];
					pixels[ y * 3584 + x * 4 + 1 ] = CONSTANTS.TILE[ off_y * 256 + off_x * 4 + 1 ];
					pixels[ y * 3584 + x * 4 + 2 ] = CONSTANTS.TILE[ off_y * 256 + off_x * 4 + 2 ];
				}
			}
		}

		function render_chunk( x, y ) {
			var data = GLOBALS.game.chunk.ctx.getImageData( 0, 0, 896, 896 ), pixels, img;;
			pixels = data.data;
			var ul_y = y + 32 - 32 * 14, ul_x = x + 32 - 32 * 14, t_x, t_y;
			for( t_y = 0; t_y < 896; ++t_y ) {
				for( t_x = 0; t_x < 896; ++t_x ) {
					render_pixel( pixels, t_x, t_y, ul_x, ul_y );
				}
			}
			GLOBALS.game.chunk.ctx.putImageData( data, 0, 0, 0, 0, 896, 896 );
			/*GLOBALS.game.chunk.ctx.translate( 448, 448 );
			GLOBALS.game.chunk.ctx.rotate( Math.PI / 4 + .15 + ( GLOBALS.game.players[ GLOBALS.game.me ].rotation / 180 * Math.PI ) );
			if( GLOBALS.game.me % 2 == 0 ) img = CONSTANTS.IMG_RED_PLAYER;
			else img = CONSTANTS.IMG_BLUE_PLAYER;
			GLOBALS.game.chunk.ctx.drawImage( img, 0, 0, 64, 64, -32, -32, 64, 64 );
			GLOBALS.game.chunk.ctx.setTransform( 1, 0, 0, 1, 0, 0 );*/
			var projectiles = GLOBALS.game.projectiles,
				players = GLOBALS.game.players,
				vicinity = [],
				j;
			for( i = 0; i < GLOBALS.host_count; ++i ) {
				if( players[ i ].active && players[ i ].x >= ul_x - 64 && players[ i ].x <= ul_x + 960 ) {
					if( players[ i ].y >= ul_y - 64 && players[ i ].y <= ul_y + 960 ) {
						if( i % 2 == 0 ) img = CONSTANTS.IMG_RED_PLAYER;
						else img = CONSTANTS.IMG_BLUE_PLAYER;
						GLOBALS.game.chunk.ctx.drawImage( img, 0, 0, 64, 64, players[ i ].x - ul_x, players[ i ].y - ul_y, 64, 64 );
						vicinity.push( i );
					}
				}
			}
			var dx, dy;
			for( i = 0; i < projectiles.length; ++i ) {
				if( projectiles[ i ].active && projectiles[ i ].x >= ul_x - 32 && projectiles[ i ].x <= ul_x + 928 ) {
					if( projectiles[ i ].y >= ul_y - 32 && projectiles[ i ].y <= ul_y + 928 ) {
						if( projectiles[ i ].red ) img = CONSTANTS.IMG_RED_BULLET;
						else img = CONSTANTS.IMG_BLUE_BULLET;
						for( j = 0; j < vicinity.length; ++j ) {
							if( projectiles[ i ].red == ( vicinity[ j ] % 2 == 1 ) ) {
								dx = GLOBALS.game.players[ vicinity[ j ] ].x - projectiles[ i ].x + 16;
								dy = GLOBALS.game.players[ vicinity[ j ] ].y - projectiles[ i ].y + 16;
								dx *= dx;
								dy *= dy;
								if( Math.sqrt( dx + dy ) < 46 ) {
									projectiles[ i ].active = false;
									if( vicinity[ j ] == GLOBALS.game.me ) GLOBALS.ws.send( LTByte( CONSTANTS.OP_HEALTH ) + LTByte( --GLOBALS.game.players[ GLOBALS.game.me ].health ) );
								}
							}
						}
						GLOBALS.game.chunk.ctx.drawImage( img, 0, 0, 32, 32, projectiles[ i ].x - ul_x, projectiles[ i ].y - ul_y, 32, 32 );
					}
				}
			}
		}

		var up, down, left, right, last = -1, clicked = false, last_fired = -1;
		up = down = left = right = false;

		function game_loop( ticks ) {
			var me = GLOBALS.game.players[ GLOBALS.game.me ], i;
			var players = GLOBALS.game.players, projectiles = GLOBALS.game.projectiles;
			if( last == -1 ) last = ticks;
			me.last_moving = me.moving;
			me.last_direction = me.direction;
			if( me.health != me.last_health ) {
				me.last_health = me.health;
				switch( me.health ) {
					case 0:
						me.active = false;
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-empty" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-empty" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-empty" );
						break;
					case 1:
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-half" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-empty" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-empty" );
						break;
					case 2:
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-empty" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-empty" );
						break;
					case 3:
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-half" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-empty" );
						break;
					case 4:
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-empty" );
						break;
					case 5:
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-half" );
						break;
					case 6:
						GLOBALS.game.hearts[ 0 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 1 ].setAttribute( "class", "heart-full" );
						GLOBALS.game.hearts[ 2 ].setAttribute( "class", "heart-full" );
						break;
				} 
			}
			me.moving = true;
			if( !up && !down && !left && !right ) me.moving = false;
			if( !up && !down && !left && right ) me.direction = 0;
			if( !up && !down && left && !right ) me.direction = 180;
			if( !up && !down && left && right ) me.moving = false;
			if( !up && down && !left && !right ) me.direction = 90;
			if( !up && down && !left && right ) me.direction = 45;
			if( !up && down && left && !right ) me.direction = 135;
			if( !up && down && left && right ) me.direction = 90;
			if( up && !down && !left && !right ) me.direction = 270;
			if( up && !down && !left && right ) me.direction = 315;
			if( up && !down && left && !right ) me.direction = 225;
			if( up && !down && left && right ) me.direction = 270;
			if( up && down && !left && !right ) me.moving = false;
			if( up && down && !left && right ) me.direction = 0;
			if( up && down && left && !right ) me.direction = 180;
			if( up && down && left && right ) me.moving = false;
			var packet = "";
			/*if( me.last_moving && !me.moving ) {
				packet += LTByte( CONSTANTS.OP_EMOVE ) + LTByte( ( me.x >> 24 ) & 0xFF ) + LTByte( ( me.x >> 16 ) & 0xFF ) + LTByte( ( me.x >> 8 ) & 0xFF ) + LTByte( me.x & 0xFF );
				packet += LTByte( ( me.y >> 24 ) & 0xFF ) + LTByte( ( me.y >> 16 ) & 0xFF ) + LTByte( ( me.y >> 8 ) & 0xFF ) + LTByte( me.y & 0xFF );
				GLOBALS.ws.send( packet );
			} else if( !me.last_moving && me.moving ) {
				packet += LTByte( CONSTANTS.OP_SMOVE ) + LTByte( ( me.x >> 24 ) & 0xFF ) + LTByte( ( me.x >> 16 ) & 0xFF ) + LTByte( ( me.x >> 8 ) & 0xFF ) + LTByte( me.x & 0xFF );
				packet += LTByte( ( me.y >> 24 ) & 0xFF ) + LTByte( ( me.y >> 16 ) & 0xFF ) + LTByte( ( me.y >> 8 ) & 0xFF ) + LTByte( me.y & 0xFF );
				packet += LTByte( ( me.direction >> 8 ) & 0xFF ) + LTByte( me.direction & 0xFF );
				GLOBALS.ws.send( packet );
			} else if( me.last_direction != me.direction ) {
				packet += LTByte( CONSTANTS.OP_SMOVE ) + LTByte( ( me.x >> 24 ) & 0xFF ) + LTByte( ( me.x >> 16 ) & 0xFF ) + LTByte( ( me.x >> 8 ) & 0xFF ) + LTByte( me.x & 0xFF );
				packet += LTByte( ( me.y >> 24 ) & 0xFF ) + LTByte( ( me.y >> 16 ) & 0xFF ) + LTByte( ( me.y >> 8 ) & 0xFF ) + LTByte( me.y & 0xFF );
				packet += LTByte( ( me.direction >> 8 ) & 0xFF ) + LTByte( me.direction & 0xFF );
				GLOBALS.ws.send( packet );
			}*/
			packet += LTByte( CONSTANTS.OP_EMOVE ) + LTByte( ( me.x >> 24 ) & 0xFF ) + LTByte( ( me.x >> 16 ) & 0xFF ) + LTByte( ( me.x >> 8 ) & 0xFF ) + LTByte( me.x & 0xFF );
			packet += LTByte( ( me.y >> 24 ) & 0xFF ) + LTByte( ( me.y >> 16 ) & 0xFF ) + LTByte( ( me.y >> 8 ) & 0xFF ) + LTByte( me.y & 0xFF );
			packet += LTByte( ( me.direction >> 8 ) & 0xFF ) + LTByte( me.direction & 0xFF );
			if( me.moving ) packet += LTByte( 0x01 );
			else packet += LTByte( 0x00 );
			
			GLOBALS.ws.send( packet );
			packet = "";
			if( clicked ) {
				if( last_fired == -1 ) {
					last_fired = ticks;
					GLOBALS.game.projectiles.push( new Projectile( GLOBALS.game.me % 2 == 0, me.x + 16, me.y + 16, me.rotation ) );
					me.x += 16;
					me.y += 16;
					packet += LTByte( CONSTANTS.OP_SHOOT ) + LTByte( ( me.x >> 24 ) & 0xFF ) + LTByte( ( me.x >> 16 ) & 0xFF ) + LTByte( ( me.x >> 8 ) & 0xFF ) + LTByte( me.x & 0xFF );
					packet += LTByte( ( me.y >> 24 ) & 0xFF ) + LTByte( ( me.y >> 16 ) & 0xFF ) + LTByte( ( me.y >> 8 ) & 0xFF ) + LTByte( me.y & 0xFF );
					packet += LTByte( ( me.rotation >> 8 ) & 0xFF ) + LTByte( me.rotation & 0xFF );
					me.x -= 16;
					me.y -= 16;
					GLOBALS.ws.send( packet );
				} else if( ticks - last_fired >= 500 ) {
					last_fired = ticks;
					GLOBALS.game.projectiles.push( new Projectile( GLOBALS.game.me % 2 == 0, me.x + 16, me.y + 16, me.rotation ) );
					me.x += 16;
					me.y += 16;
					packet += LTByte( CONSTANTS.OP_SHOOT ) + LTByte( ( me.x >> 24 ) & 0xFF ) + LTByte( ( me.x >> 16 ) & 0xFF ) + LTByte( ( me.x >> 8 ) & 0xFF ) + LTByte( me.x & 0xFF );
					packet += LTByte( ( me.y >> 24 ) & 0xFF ) + LTByte( ( me.y >> 16 ) & 0xFF ) + LTByte( ( me.y >> 8 ) & 0xFF ) + LTByte( me.y & 0xFF );
					packet += LTByte( ( me.rotation >> 8 ) & 0xFF ) + LTByte( me.rotation & 0xFF );
					me.x -= 16;
					me.y -= 16;
					GLOBALS.ws.send( packet );
				}
			}
			for( i = 0; i < players.length; ++i ) {
				update_player( players[ i ], ticks - last );
			}
			for( i = 0; i < projectiles.length; ++i ) {
				update_projectile( projectiles[ i ], ticks - last );
			}
			render_chunk( me.x | 0, me.y | 0 );
			last = ticks;
			var height = GLOBALS.game.view.canvas.height;
			GLOBALS.game.view.ctx.clearRect( 0, 0, 896, height );
			GLOBALS.game.view.ctx.drawImage( GLOBALS.game.chunk.canvas, 0, 448 - ( height / 2 ) | 0, 896, height, 0, 0, 896, height );
			window.requestAnimationFrame( game_loop );
		}		

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
		GLOBALS[ "demo_interval" ] = null;

		function keep_alive_interval() {
			GLOBALS.ws.send( LTByte( 0xFF ) );
			console.log( "keep_alive" );
		}

		function demo_interval() {
			console.log( "im runnign bitch" )
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

		GLOBALS.keep_alive_interval = setInterval( keep_alive_interval, 5000 );

		var demo_room = document.getElementById( "maze" ),
			create_room_button = document.getElementById( "create-room-button" ),
			waiting_room_button = document.getElementById( "waiting-room-button" ),
			waiting_room_div = document.getElementById( "waiting-room-div" ),
			countdown = document.getElementById( "countdown" ),
			room_creation = document.getElementById( "room" ),
			waiting_room = document.getElementById( "waiting" ),
			game_room = document.getElementById( "game" ),
			red_vs = document.getElementById( "red-vs" ),
			blue_vs = document.getElementById( "blue-vs" ),
			cd = 5;
			
		GLOBALS[ "cd_inv" ] = null;

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

		function countdown_timer() {
			countdown.innerHTML = --cd;
			if( cd == 0 ) {
				clearInterval( GLOBALS.cd_inv );
				GLOBALS.ws.send( LTByte( CONSTANTS.OP_START ) );
			}
		}

		function waiting_room_pressed( evt ) {
			GLOBALS.ws.send( LTByte( CONSTANTS.OP_CDOWN ) );
		}

		function waiting_room_received() {
			GLOBALS.demo_interval = setInterval( demo_interval, 750 );
			waiting_room_div.setAttribute( "class", "hidden" );
			countdown.setAttribute( "class", "visible" );
			GLOBALS.cd_inv = setInterval( countdown_timer, 1000 );
		}

		waiting_room_button.addEventListener( "click", waiting_room_pressed );
		waiting_room_button.addEventListener( "touchstart", waiting_room_pressed );

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
					console.log( msg.charCodeAt( 1 ) );
					switch( msg.charCodeAt( 1 ) ) {
						case CONSTANTS.RESP_JOIN_SUCCESS:
							GLOBALS.room_created = true;
							if( GLOBALS.host ) {
								++GLOBALS.host_count;
								update_room();
							}
							break;
						case CONSTANTS.RESP_JOIN_NULLROOM:
							demo_room.setAttribute( "class", "visible" );
							room_creation.setAttribute( "class", "visible" );
							GLOBALS.demo_interval = setInterval( demo_interval, 750 );
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
					console.log('whi');
					if( GLOBALS.host ) {
						waiting_room_received();
					} else {
						rng_set_seed( ( ( msg.charCodeAt( 1 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 2 ) << 16 ) + ( msg.charCodeAt( 3 ) << 8 ) + msg.charCodeAt( 4 ) );
						GLOBALS.game.me = ( ( msg.charCodeAt( 7 ) << 8 ) >>> 0 ) + ( ( msg.charCodeAt( 8 ) & 0xFF ) >>> 0 );
						GLOBALS.host_count = ( ( msg.charCodeAt( 5 ) << 8 ) >>> 0 ) + ( ( msg.charCodeAt( 6 ) & 0xFF ) >>> 0 );
						for( GLOBALS.game.maze_size = 1; GLOBALS.host_count * 5 > GLOBALS.game.maze_size * GLOBALS.game.maze_size; ++GLOBALS.game.maze_size );
						console.log( GLOBALS.host_count );
						console.log( GLOBALS.game.maze_size );
						generate_bool_maze();

						for( var i = 0; i < GLOBALS.host_count; ++i ) {
							GLOBALS.game.players[ i ].active = true;
							GLOBALS.game.players[ i ].x = 192 + 384 * ( ( i * 5 ) % GLOBALS.game.maze_size );
							GLOBALS.game.players[ i ].y = 192 + 384 * ( ( ( i * 5 ) / GLOBALS.game.maze_size ) | 0 );
						}

						//GLOBALS.game.players[ GLOBALS.game.me ].active = true;
						//GLOBALS.game.players[ GLOBALS.game.me ].x = 128;
						//GLOBALS.game.players[ GLOBALS.game.me ].y = 128;
					}
					break;
				case CONSTANTS.OP_START:
					if( GLOBALS.host ) {
						countdown.setAttribute( "class", "hidden" );
					} else {
						game_room.setAttribute( "class", "visible" );
						clearInterval( GLOBALS.keep_alive_interval );
						window.requestAnimationFrame( game_loop );
					}
					break;
				case CONSTANTS.OP_POS:
					var uid = ( msg.charCodeAt( 1 ) << 8 ) + ( msg.charCodeAt( 2 ) );
					if( uid == GLOBALS.game.me ) break;
					GLOBALS.game.players[ uid ].x = ( ( msg.charCodeAt( 3 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 4 ) << 16 ) + ( msg.charCodeAt( 5 ) << 8 ) + msg.charCodeAt( 6 );
					GLOBALS.game.players[ uid ].y = ( ( msg.charCodeAt( 7 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 8 ) << 16 ) + ( msg.charCodeAt( 9 ) << 8 ) + msg.charCodeAt( 10 );
					GLOBALS.game.players[ uid ].direction = ( msg.charCodeAt( 11 ) << 8 ) + ( msg.charCodeAt( 12 ) );
					GLOBALS.game.players[ uid ].moving = msg.charCodeAt( 3 ) == 0x01;
					break;
				case CONSTANTS.OP_SMOVE:
					var uid = ( msg.charCodeAt( 1 ) << 8 ) + ( msg.charCodeAt( 2 ) );
					if( uid == GLOBALS.game.me ) break;
					GLOBALS.game.players[ uid ].x = ( ( msg.charCodeAt( 3 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 4 ) << 16 ) + ( msg.charCodeAt( 5 ) << 8 ) + msg.charCodeAt( 6 );
					GLOBALS.game.players[ uid ].y = ( ( msg.charCodeAt( 7 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 8 ) << 16 ) + ( msg.charCodeAt( 9 ) << 8 ) + msg.charCodeAt( 10 );
					GLOBALS.game.players[ uid ].direction = ( msg.charCodeAt( 11 ) << 8 ) + ( msg.charCodeAt( 12 ) );
					GLOBALS.game.players[ uid ].moving = true;
					break;
				case CONSTANTS.OP_EMOVE:
					var uid = ( msg.charCodeAt( 1 ) << 8 ) + ( msg.charCodeAt( 2 ) );
					if( uid == GLOBALS.game.me ) break;
					GLOBALS.game.players[ uid ].x = ( ( msg.charCodeAt( 3 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 4 ) << 16 ) + ( msg.charCodeAt( 5 ) << 8 ) + msg.charCodeAt( 6 );
					GLOBALS.game.players[ uid ].y = ( ( msg.charCodeAt( 7 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 8 ) << 16 ) + ( msg.charCodeAt( 9 ) << 8 ) + msg.charCodeAt( 10 );
					GLOBALS.game.players[ uid ].moving = false;
					break;
				case CONSTANTS.OP_SHOOT:
					var uid = ( msg.charCodeAt( 1 ) << 8 ) + ( msg.charCodeAt( 2 ) );
					if( uid == GLOBALS.game.me ) break;
					var x = ( ( msg.charCodeAt( 3 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 4 ) << 16 ) + ( msg.charCodeAt( 5 ) << 8 ) + msg.charCodeAt( 6 ),
						y = ( ( msg.charCodeAt( 7 ) << 24 ) >>> 0 ) + ( msg.charCodeAt( 8 ) << 16 ) + ( msg.charCodeAt( 9 ) << 8 ) + msg.charCodeAt( 10 ),
						direction = ( msg.charCodeAt( 11 ) << 8 ) + ( msg.charCodeAt( 12 ) );
					GLOBALS.game.projectiles.push( new Projectile( uid % 2 == 0, x, y, direction ) );
					break;
				case CONSTANTS.OP_HEALTH:
					var uid = ( msg.charCodeAt( 1 ) << 8 ) + ( msg.charCodeAt( 2 ) );
					if( uid == GLOBALS.game.me ) break;
					GLOBALS.game.players[ uid ].health = msg.charCodeAt( 3 );
					break;
			}
			//console.log( msg );
		}

		GLOBALS.ws = new WebSocket( "wss://labyrintech.herokuapp.com" );
		//GLOBALS.ws = new WebSocket( "ws://localhost:5001" );
		GLOBALS.ws.onopen = ws_open;
		GLOBALS.ws.onclose = ws_close;
		GLOBALS.ws.onmessage = ws_msg;

		function key_pressed( evt ) {
			switch( evt.keyCode ) {
				case 87:
					up = true;
					break;
				case 68:
					right = true;
					break;
				case 83:
					down = true;
					break;
				case 65:
					left = true;
					break;
			}
		}

		function key_released( evt ) {
			switch( evt.keyCode ) {
				case 87:
					up = false;
					break;
				case 68:
					right = false;
					break;
				case 83:
					down = false;
					break;
				case 65:
					left = false;
					break;
			}
		}

		function mouse_hover( e ) {
			var view = GLOBALS.game.view.canvas;
			var rect = this.getBoundingClientRect(),
				x = ( ( e.clientX - rect.left ) / rect.width * view.width - 448 ) | 0,
				y = ( ( e.clientY - rect.top ) / rect.height * view.height - ( view.height / 2 ) ) | 0;
			GLOBALS.game.players[ GLOBALS.game.me ].rotation = ( ( Math.atan2( y, x ) / Math.PI * 180 + 360 ) % 360 ) | 0;
		}

		function mouse_context( e ) {
			e.preventDefault();
			return false;
		}

		function mouse_clicked( e ) {
			if( e.button == 0 ) {
				clicked = true;
			}
		}

		function mouse_released( e ) {
			if( e.button == 0 ) {
				clicked = false;
			}
		}


		document.addEventListener( "keydown", key_pressed, false );
		document.addEventListener( "keyup", key_released, false );
		document.body.appendChild( GLOBALS.game.chunk.canvas );

		GLOBALS.game.view.canvas.addEventListener( "mousemove", mouse_hover );
		GLOBALS.game.view.canvas.addEventListener( "mousedown", mouse_clicked );
		GLOBALS.game.view.canvas.addEventListener( "mouseup", mouse_released );
		GLOBALS.game.view.canvas.addEventListener( "contextmenu", mouse_context );

		if( DEBUG ) {
			window.GLOBALS = GLOBALS;
			window.CONSTANTS = CONSTANTS;
		}
	}

	function asset_loaded() {
		++loaded;
		if( loaded == 5 ) {
			var canvas = document.createElement( "canvas" ), ctx;
			canvas.width = 64;
			canvas.height = 64;
			ctx = canvas.getContext( "2d" );
			ctx.drawImage( CONSTANTS.IMG_FLOOR, 0, 0, 64, 64, 0, 0, 64, 64 );
			CONSTANTS[ "TILE" ] = ctx.getImageData( 0, 0, 64, 64 );
			CONSTANTS.TILE = CONSTANTS.TILE.data;
			assets_loaded();
		}
	}

	CONSTANTS.IMG_RED_PLAYER.addEventListener( "load", asset_loaded );
	CONSTANTS.IMG_BLUE_PLAYER.addEventListener( "load", asset_loaded );
	CONSTANTS.IMG_RED_BULLET.addEventListener( "load", asset_loaded );
	CONSTANTS.IMG_BLUE_BULLET.addEventListener( "load", asset_loaded );
	CONSTANTS.IMG_FLOOR.addEventListener( "load", asset_loaded );

	CONSTANTS.IMG_RED_PLAYER.src = "assets/red_player.png";
	CONSTANTS.IMG_BLUE_PLAYER.src = "assets/blue_player.png";
	CONSTANTS.IMG_RED_BULLET.src = "assets/red_bullet.png";
	CONSTANTS.IMG_BLUE_BULLET.src = "assets/blue_bullet.png";
	CONSTANTS.IMG_FLOOR.src = "assets/floor.png";
}

window.addEventListener( "load", maze_load );