$(document).ready(function() {
	var fgContext = $('#foreground').getContext();
	var bgContext0 = $('#bg0').getContext();
	
	var viewport = {
		height: 600,
		width: 800,
		zoom: 0,
		x0: -400, 
		x1: 400,
		y0: -300,
		y1: 300,

	};
	
	//adjust viewport to reflect new zoom level
	function zoom(level) {

	}

	function drawMap() {
		dimensions = getViewportDimensions();	
	}

	function getViewportDimensions() {
		var zoom = viewport.zoom;
		var x1 = viewport.x;
		
		var x2 = x1 + 600 - zoom * 200;
		
		var y1

	}
});
