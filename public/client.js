$(document).ready(function() {
	var canvas = document.getElementById('foreground');
	var fgContext = canvas.getContext('2d');
	var canvas = document.getElementById('bg0');
	var bgContext = canvas.getContext('2d');


//initial values for viewport	
	var viewport = {
		height: 600,
		width: 800,
		zoom: 1.0,
		x0: 0, 
		//x1: 800,
		//y0: 0,
		//y1: 600,
		//ground level
		groundY: 200,
		//zoomed out
		currView: 0,
	};

//default zoomed in left-hand position
	var defaultLeft = {
		zoom: 2.0,
		x0: 0,
		viewCode: 1,
	};

//default zoomed in right-hand position
	var defaultRight = {
		zoom: 2.0,
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
	var moving = false
	//whether we are shooting
	var shooting = false;
	//global var so that we can always stop motion if we want
	var interval;

	//At full size, offset from the slingshot to the rubber band attachment points
	const ssOffset = {
		front: { x: 0, y: 0 },
		back: { x: 0, y: 0}
	};
	//height of the slingshot;
	const ssHeight = 199;
	//max size of rubber band
	const bandSize = 350;
	

//load all the images and store them, then call redraw()
	function init() {
		var bg1TileSrcs = {'BLUE_GRASS_FG_1.png': {height: 187, width: 332, defaultY: viewport.height - viewport.groundY, index: 1, vpHeight: 93.5, vpWidth: 166},
									 'BLUE_GRASS_FG_2.png': {height: 33, width: 332, defaultY: viewport.height - viewport.groundY - 16.5, index: 2, vpHeight: 16.5, vpWidth: 166}, 
		};
		var bg1ImgSrcs = {'SLINGSHOT_01_BACK.png': {height: 199, width: 38, defaultY: viewport.height - viewport.groundY - 99.5, defaultX: 135, index: 1, vpHeight: 99.5, vpWidth: 19},
									 		'SLINGSHOT_01_FRONT.png': {height: 124, width: 43, defaultY: viewport.height - viewport.groundY - 104, defaultX: 120, index: 2, vpHeight: 62, vpWidth: 21.5},
		};
		var fgImgSrcs = {
									 'INGAME_BIRDS_PIGS.png': {height: 920, width: 859},
									 'SLINGSHOT_RUBBERBAND.png': {height: 16, width: 14, vpWidth: 7},
		};
		/*var bg1TileSrcs = {'BLUE_GRASS_FG_1.png': {height: 187 / 2, width: 332 / 2, defaultY: viewport.height - viewport.groundY, index: 1},
									 'BLUE_GRASS_FG_2.png': {height: 33 / 2, width: 332 / 2, defaultY: viewport.height - viewport.groundY - 33, index: 2}, 
		};
		var bg1ImgSrcs = {'SLINGSHOT_01_BACK.png': {height: 199 / 2, width: 38 / 2, defaultY: viewport.height - viewport.groundY - 199, defaultX: 180, index: 1},
									 		'SLINGSHOT_01_FRONT.png': {height: 124 / 2, width: 43 / 2, defaultY: viewport.height - viewport.groundY - 204, defaultX: 150, index: 2},
		};
		var fgImgSrcs = {
									 'INGAME_BIRDS_PIGS.png': {height: 920, width: 859},
									 'SLINGSHOT_RUBBERBAND.png': {height: 16, width: 14},
		};*/
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
			img.vpWidth = data.vpWidth;
			img.vpHeight = data.vpHeight;

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
			img.index = data.index;
			img.vpWidth = data.vpWidth;
			img.vpHeight = data.vpHeight;

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
			img.vpWidth = data.vpWidth;

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
		if(moving) {
			return;
		}
		moving = true;
		if(x > viewport.x0) {
			incr = 4;
		} else if(x < viewport.x0){
			incr = -4;
		} else {
			zoom - viewport.zoom > 0 ? incr = -4 : incr = 4;
		}
		if(zoom != viewport.zoom) {
			var zoomDiff;
			if(viewport.x0 != x) {
				zoomDiff = ((zoom - viewport.zoom) / (x - viewport.x0 )) * incr;
			} else {
				var steps = (viewport.height / zoom - viewport.height / viewport.zoom) / incr;
				zoomDiff = (zoom - viewport.zoom) / steps;

			}
			console.log('zoomDiff: ' + zoomDiff);
		}

		//set the redraw interval
		interval = setInterval(function() {
			if(! transitionView(x, zoom, zoomDiff)) {
				clearInterval(interval);
				moving = false;
				viewport.x0 = x;
				viewport.zoom = zoom;
				redraw();
			}
		}, 20);
	}
	
//handles a single frame of animation by adjusting image size and position and redrawing the canvas.
	function transitionView(goalX, goalZoom, zoomDiff) {
		if(Math.abs(viewport.x0 - goalX) < 5) {
			 if (zoomDiff == undefined || Math.abs(viewport.zoom - goalZoom) < .01) {
				return false;
			} else {
				viewport.zoom += zoomDiff;
			}
		} else {
			viewport.x0 += incr;
			if(zoomDiff != undefined) {
				viewport.zoom += zoomDiff;
			}
		}
		redraw();
		return true;
	}
	
	//redraw the entire canvas with updated positions.
	function redraw() {
		bgContext.clearRect(0, 0, viewport.width, viewport.height);
		placeBgTiles();
		placeBgImages();
	}

/*
* event handlers
*/
//this is set on mousedown, then used to prevent action on long clicks.
var mouseDownTime;

//click handler
	var panner = function(e) {
		if(moving) {
			return;
		}
		//if the click was a long click, don't do anything
		if(e.timeStamp - mouseDownTime > 200) {
			return;
		}
		//click event gets triggered on mouseup. This adds a delay so that we won't do anything on the intial mouseup.
		if(shooting) {
			shooting = false;
			return;
		}
		if(getRightBound() + viewport.x0 >= viewport.width) {
			modifyViewport(defaultLeft.zoom, defaultLeft.x0);
		} else {
			modifyViewport(defaultRight.zoom, defaultRight.x0);
		}
	};

//toggle zoom and panning
	$('canvas').click(function(e) {
		panner(e)
	})
//zoom in and out with mousewheel
	.mousewheel(function() {
		if(!moving) {
			if(viewport.zoom > 1.5) {
				//since we're going to the fully zoomed out pos, set viewport x to 0 so we're seeing the whole world.
				modifyViewport(1.0, 0);
			} else {
				modifyViewport(2.0, viewport.x0);
			}
		}
	})
	//rubber band animations
 .mousedown(function(e) {
	 if(moving) {
		return;
	 }
	 mouseDownTime = e.timeStamp;
	 console.log('zoom: ' + viewport.zoom);
		
		var canvasCoords = $('canvas').offset();
		var relX = e.pageX - canvasCoords.left;
		var relY = e.pageY - canvasCoords.top;
		var rad = getBandSize(relX, relY);
		console.log('rad: ' + rad);
		//If cursor is outside of the range of the rubber band, return
		if(rad > bandSize) {
			return;
		}
		//If we're not in a position to shoot, return.
	 if(viewport.x0 != 0){
		return;
	 }
	 moving = true;
	 shooting = true;

		prepareShot(relX, relY);
		$(this).mousemove(function(e2) {
			var relX2 = e2.pageX - canvasCoords.left;
			var relY2 = e2.pageY - canvasCoords.top;
			if(getBandSize(relX2, relY2) > bandSize) {
				return;
			}
			prepareShot(e2.pageX - canvasCoords.left, e2.pageY - canvasCoords.top);
		});
		$(this).unbind('click');
	})
 .mouseup(function(e) {
	 //clear the slingshot graphics
	clearShot();
	//unbind mousemove handler
	$(this).unbind('mousemove');
	//rebind the click handler
	$(this).click(panner);
	 moving = false;
 });



	init();

	//helper functions
	function prepareShot(mouseX, mouseY) {
		fgContext.clearRect(0, 0, viewport.width, viewport.height);
		var img = fgImages['SLINGSHOT_RUBBERBAND.png'];
		//scale these down by .5
		var canvWidth = .3 * getPixels(img.width);
		var canvHeight = .3 * getPixels(img.height);
		var ss = getSS();

		var mouseVpCoords = getViewportCoords(mouseX, mouseY);

		for(var i in ss) {
			var ssComponent = ss[i];
			var coords = getCanvasCoords(ssComponent.defaultX, ssComponent.defaultY);
			if(ssComponent.index == 1) {
				coords.x += ssOffset.front.x;
				coords.y += ssOffset.front.y
			} else {
				coords.x += ssOffset.back.x;
				coords.y += ssOffset.back.y;
			}
			console.log('defX: ' + coords.x);
			console.log('defY: ' + coords.y);


			var delX = ssComponent.defaultX - mouseVpCoords.x;
			var delY = ssComponent.defaultY - mouseVpCoords.y;
			var angle = Math.atan(1.0 * delY / delX);
			if(delX < 0) {
				angle += Math.PI;
			}

			fgContext.save();
			fgContext.translate(mouseX, mouseY);
			fgContext.rotate(angle);
			var rotHor = 0;
			var dist = Math.sqrt(delX * delX + delY * delY);

			while(rotHor + canvWidth <  getPixels(dist)) {
				
				fgContext.drawImage(img, rotHor, -1 * canvHeight / 2.0, canvWidth, canvHeight);
				rotHor += canvWidth - 1;
			}
			//last tile
			var finalCanvWidth = getPixels(dist) - rotHor;
			fgContext.drawImage(img, 0, 0, finalCanvWidth * (canvWidth / img.vpWidth), img.height, rotHor, -1 * canvHeight / 2, finalCanvWidth, canvHeight);
			fgContext.restore();

		}
	}

	function clearShot() {
		fgContext.clearRect(0, 0, viewport.width, viewport.height);
	}

	function getRightBound() {
		var coords = getViewportCoords(800, 0);
		return coords.x
	}
	
	//place non-tile background images	
	function placeBgImages() {
		for(var i in bgImages) {
			var img = bgImages[i];

			var height = getPixels(img.vpHeight);
			var width = getPixels(img.vpWidth);
			var x;

			if(img.defaultX < viewport.x0 && img.defaultX + img.vpWidth > viewport.x0) {
				var crop = viewport.x0 - img.defaultX;
				/*while(crop > img.vpWidth) {
					crop -= img.vpWidth;
				}*/

				var imageWidth = Math.round(img.width - crop * (img.width / img.vpWidth));

				var canvCoords = getCanvasCoords(viewport.x0, img.defaultY);
				console.log([img, crop * (img.width / img.vpWidth), 0, imageWidth, img.height, canvCoords.x, canvCoords.y, width - getPixels(crop), height]);
				bgContext.drawImage(img, crop * (img.width / img.vpWidth), 0, imageWidth, img.height, canvCoords.x, canvCoords.y, width - getPixels(crop), height);
			} else if(img.defaultX >= viewport.x0) {
				var canvCoords = getCanvasCoords(img.defaultX, img.defaultY);
				bgContext.drawImage(img, canvCoords.x, canvCoords.y, width, height);
			}
		}
	}

		//place tile images	
	function placeBgTiles() {
		for(var i in bgTiles) {
			var img = bgTiles[i] 
			//scaled dimensions of the image to account for zoom
			canvWidth = getPixels(img.vpWidth);
			canvHeight = getPixels(img.vpHeight);
			
			//crop of the first image.
			var initialOffset = viewport.x0;
			while(initialOffset > img.vpWidth) {
				initialOffset -= img.vpWidth;
			}
			//initial width of the image, adjusted for the viewport position
			var initialCanvWidth = canvWidth - getPixels(initialOffset);

			var horzPos = 0;

			
			//specific positioning for each image
			var y;	
			switch(img.index){
				case 1: 
					y = viewport.height - viewport.groundY;
					break;
				case 2: 
					y = viewport.height - viewport.groundY - img.vpHeight;
					break;
			}
			//first tile
			var canvCoords = getCanvasCoords(viewport.x0, y);
			bgContext.drawImage(img, initialOffset * (img.width / img.vpWidth), 0, img.width - initialOffset * (img.width / img.vpWidth), img.height, horzPos, canvCoords.y, initialCanvWidth, canvHeight);

			horzPos += initialCanvWidth;

			//filler tiles
			while(horzPos + canvWidth <= viewport.width) {
				bgContext.drawImage(img, horzPos, canvCoords.y, canvWidth, canvHeight);
				horzPos += canvWidth;
			}
	
			//last tile
			var finalWidth = getUnits(viewport.width - horzPos);
			while(finalWidth <= 0) {
				finalWidth += img.vpWidth;
			}
			bgContext.drawImage(img, 0, 0, finalWidth * (img.width / img.vpWidth), img.height, horzPos, canvCoords.y, getPixels(finalWidth), canvHeight);
		}
	}
	
	//returns an object that contains both slingshot images
	function getSS() {
		return bgImages;
	}
	
	function getBandSize(mouseX, mouseY) {
		var sec1, sec2;
		var coords = getViewportCoords(mouseX, mouseY);
		var ss = getSS();
		for(var i in ss) {
			img = ss[i];
			if(img.index == 1) {
				var y = viewport.height - viewport.groundY  - ssHeight + ssOffset.front.y;
				var x = img.defaultX + ssOffset.front.x;
				sec1 = Math.sqrt((coords.x - x) * (coords.x - x) + (coords.y - y) * (coords.y - y));
			} else {
				var y = viewport.height - viewport.groundY  - ssHeight + ssOffset.back.y;
				var x = img.defaultX + ssOffset.back.x;
				sec2 = Math.sqrt((coords.x - x) * (coords.x - x) + (coords.y - y) * (coords.y - y));
			}
			
		}
		return sec1 + sec2;
	}

//given a pixel location, convert to global viewport location
	function getViewportCoords(canX, canY) {
		var vpX = Math.round(canX / viewport.zoom + viewport.x0);
		var vpY = Math.round((canY - viewport.height + viewport.groundY) / viewport.zoom + viewport.height - viewport.groundY);
		return {x: vpX, y: vpY};
	}

//given a global viewport x and y, get coords on the canvas right now
	function getCanvasCoords(viewportX, viewportY) {
		if(viewportX < viewport.x0) {
			return -1;
		}
		var x = Math.round((viewportX - viewport.x0) * viewport.zoom);
		var y = Math.round((viewportY - viewport.height + viewport.groundY) * viewport.zoom + viewport.height - viewport.groundY);
		return {x: x, y: y}
	}

//convert viewport units to pixels
	function getPixels(x) {
		return Math.round(x * viewport.zoom);
	}
//convert pixels to viewport units
	function getUnits(x) {
		return Math.ceil(x / viewport.zoom);
	}

});
