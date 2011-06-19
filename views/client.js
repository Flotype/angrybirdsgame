$(document).ready(function() {
	var fgContext = $('#foreground').getContext();
	var bgContext0 = $('#bg0').getContext();
	
	var viewport = {
		zoom: 0,
		x: -300, 
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
