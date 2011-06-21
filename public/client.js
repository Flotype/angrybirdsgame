$(document).ready(function() {
	var canvas = document.getElementById('foreground');
	var fgContext = canvas.getContext('2d');
	var canvas = document.getElementById('bg0');
	var bgContext = canvas.getContext('2d');

//initial values for viewport	
	var viewport = {
		height: 600,
		width: 800,
		zoom: .5,
		x0: 0, 
		x1: 800,
		y0: 0,
		y1: 600,
		//ground level
		groundY: 200,
		//zoomed out
		currView: 0,
	};

//default zoomed in left-hand position
	var defaultLeft = {
		zoom: 1.0,
		x0: 0,
		viewCode: 1,
	};

//default zoomed in right-hand position
	var defaultRight = {
		zoom: 1.0,
		x0: 400,
		viewCode: 2,
	}

//stores images for tiling
	var bgTiles = {};
//stores bg static images;
	var bgImages = {}
//stores images that live on the foreground
	var fgImages = {};

//speed that viewport is moved
	var incr;
	//whether or not we are in motion;
	var moving = false;

//load all the images and store them, then call redraw()
	function init() {
		var bg1TileSrcs = {'BLUE_GRASS_FG_1.png': {height: 187, width: 332, defaultY: viewport.height - viewport.groundY, index: 1},
									 'BLUE_GRASS_FG_2.png': {height: 33, width: 332, defaultY: viewport.height - viewport.groundY - 33, index: 2}, 
		};
		var bg1ImgSrcs = {'SLINGSHOT_01_BACK.png': {height: 199, width: 38, defaultY: viewport.height - viewport.groundY - 124, defaultX: 40},
									 		'SLINGSHOT_01_FRONT.png': {height: 124, width: 43, defaultY: viewport.height - viewport.groundY - 124, defaultX: 40},
		};
		var fgImgSrcs = {
									 'INGAME_BIRDS_PIGS.png': {height: 920, width: 859},
									 'SLINGSHOT_RUBBERBAND.png': {height: 16, width: 14},
		};
		var loaded = 0;
		var tileKeys = Object.keys(bg1TileSrcs);
		var bgKeys = Object.keys(bg1ImgSrcs);
		var fgKeys = Object.keys(fgImgSrcs);

		var totalImages = tileKeys.length + bgKeys.length + fgKeys.length;

		//load tile images
		var key;
		for(var i = 0, ll = tileKeys.length; i < ll; i++) {
			key = tileKeys[i];
			data = bg1TileSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.width = data.width;
			img.defaultY= data.defaultY;
			img.index = data.index;

			bgTiles[key] = img;
			//when all images are loaded, draw.
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					redraw();
				}
			}
		};

		//load non-tile bg images
		for(var i = 0, ll = bgKeys.length; i < ll; i++) {
			key = bgKeys[i];
			data = bg1ImgSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;
			img.defaultY = data.defaultY;
			img.defaultX = data.defaultX;

			bgImages[key] = img;
			//when all images are loaded, draw;
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					redraw();
				}
			}
		}

		//load foreground images
		for(var i = 0, ll = fgKeys.length; i < ll; i++) {
			key = fgKeys[i];
			data = fgImgSrcs[key];

			var img = new Image();
			img.src = '/images/' + key;
			img.height = data.height;

			img.defaultY = data.defaultY;
			img.defaultX = data.defaultX;

			fgImages[key] = img;
			//when all images are loaded, draw;
			img.onload = function() {
				loaded++;
				if(loaded == totalImages) {
					redraw();
				}
			}
		}
	}

//called whenever some change to the viewport is occurring.	
	function modifyViewport(zoom, x) {
		moving = true;
		if(x > viewport.x0) {
			incr = 4;
		} else {
			incr = -4
		}
		if(zoom != viewport.zoom) {
			if(viewport.x0 != x) {
				var zoomDiff = ((zoom - viewport.zoom) / Math.abs((viewport.x0 - x))) * incr;
			} else {
				var zoomDiff = (2.0 / 400);
			}
		}
		//set the redraw interval
		var interval = setInterval(function() {
			if(! transitionView(x, zoom, zoomDiff)) {
				clearInterval(interval);
			}
		}, 10);
	}
	
//handles a single frame of animation by adjusting image size and position and redrawing the canvas.
	function transitionView(goalX, goalZoom, zoomDiff) {
		if(Math.abs(viewport.x0 - goalX) < 2 && (zoomDiff == undefined || Math.abs(viewport.zoom - goalZoom) < .01)) {
			return false;
		} else {

			viewport.x0 += incr;
			viewport.x1 += incr;
			if(goalZoom != undefined) {
				viewport.zoom += zoomDiff;
			}
			redraw();
			return true;
		}
	}
	
	//redraw the entire canvas with updated positions.
	function redraw() {
		bgContext.clearRect(0, 0, viewport.width, viewport.height);
		
		//tile images	
		for(var i in bgTiles) {
			var img = bgTiles[i] 
			//scaled dimensions of the image to account for zoom
			adjustedWidth = img.width *  viewport.zoom;
			adjustedHeight = img.height * viewport.zoom;
			
			//initial width of the image, adjusted for the viewport position
			var initialWidth = (img.width - viewport.x0) * viewport.zoom;
			while(initialWidth < 0) {
				initialWidth += adjustedWidth;
			}
			initialWidth = Math.ceil(initialWidth);

			//offset of the first image, in terms of the images original size.
			var initialOffset = img.width - (initialWidth / viewport.zoom);
			var horzPos = 0;
			
			var y;	
			switch(img.index){
				case 1: y = viewport.height - viewport.groundY;
								break;
				case 2: y = viewport.height - viewport.groundY - img.height * viewport.zoom;
			}

			//first tile
			bgContext.drawImage(img, initialOffset, 0, initialWidth / viewport.zoom, img.height, 0, y, initialWidth, adjustedHeight);

			horzPos += initialWidth;

			//filler tiles
			adjustedWidth = Math.ceil(adjustedWidth);
			while(horzPos + adjustedWidth <= viewport.x1 - viewport.x0) {
				bgContext.drawImage(img, horzPos, y, adjustedWidth, adjustedHeight);
				horzPos += adjustedWidth;
			}
	
			//last tile
			var finalWidth = (viewport.x1 - viewport.x0) - horzPos;
			bgContext.drawImage(img, 0, 0, finalWidth / viewport.zoom, img.height, horzPos, y, finalWidth, adjustedHeight);
		}
	}

	$('canvas').click(function() {
		if(!moving) {
			modifyViewport(defaultRight.zoom, defaultRight.x0);
		}
	});



	init();
});
