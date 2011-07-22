var config = {
	//relevent viewport information
		viewport: {
			height: 600,
			width: 1600,
			zoom: 0.5,
			x0: 0,
			groundY: 100,
		},
	//default view zoomed in to the left
		defaultLeft: {
			zoom: 1.0,
			x0: 0,
			viewCode: 1,
		},
	//default view zoomed in to the right.
		defaultRight: {
			zoom: 1.0,
			x0: 800,
			viewCode: 2,
		},
	//viewport unit height of the slingshot
		ssHeight: 199,
	//viewport unit offsets of the slingshot
		ssOffset: {
			front: {
				x: 17,
				y: 20,
			},

			back: {
				x: 12,
				y: 20,
			},
		},
	//size of the slingshot rubber band (used in getBandSize())
		bandSize: 170,
	//force coefficient for physics
		forceCoeff: 20000000,
	//image sources for background tiles
		bg1TileSrcs: {
			'BLUE_GRASS_FG_1.png': {
				height: 187, width: 332, index: 1, vpHeight: 93.5, vpWidth: 166
			},
			'BLUE_GRASS_FG_2.png': {
				height: 33, width: 332, index: 2, vpHeight: 16.5, vpWidth: 166
			},
			'BLUE_GRASS_BG_1.png': {
				height: 318, width: 478, index: 3, vpHeight: 318, vpWidth: 478
			},
			'BLUE_GRASS_BG_2.png': {
				height: 204, width: 478, index: 4, vpHeight: 204,  vpWidth: 478
			},
			'BLUE_GRASS_BG_3.png': {
				height: 63, width: 443, index: 5, vpHeight: 63, vpWidth: 443
			}
		},

		fgImgSrcs : {
									 'INGAME_BIRDS_PIGS.png': {height: 920, width: 859},
									 'SLINGSHOT_RUBBERBAND.png': {height: 16, width: 14, vpWidth: 7},
									 'INGAME_BLOCKS_BASIC.png': {height: 739, width: 791},
									 'INGAME_BLOCKS_MISC.png': {height: 494, width: 585},
									 'FONT_MENU.png': {height: 182, width: 512},
									 'FONT_BASIC.png': {height: 235, width: 512},
		},

		bg1ImgSrcs : {
			'SLINGSHOT_01_BACK.png': {
				height: 199, width: 38, defaultX: 135, index: 1, vpHeight: 99.5, vpWidth: 19
				},
			'SLINGSHOT_01_FRONT.png': {
				height: 124, width: 43, defaultY: 42, defaultX: 120, index: 2, vpHeight: 62, vpWidth: 21.5
				},
		},

		//positions of the digits in FONT_MENU.png
		font: {
				zero: {},
				one: {},
				two: {},
				three: {},
				four: {},
				five: {},
				six: {},
				seven: {},
				eight: {},
				nine: {},	
		},

		skyColor: '#99C8DA',
		groundColor: '#040A35',
}
