

/**
 * gaugeViewT class - a gauge viewer for a model
 *
 * uses https://github.com/HanSolo/SteelSeries-Canvas to display gauges
 */
var gaugeViewT = Backbone.View.extend({
	tagName:	'div',

	//
	// set some defaults for the gauge display
	//
	defaults: {
		id: 'gauge',
		size: 240,
		unitString: '°F',
		pointerType: steelseries.PointerType.TYPE3,
		frameDesign: steelseries.FrameDesign.STEEL,
		backgroundColor: steelseries.BackgroundColor.WHITE,
		threshold:100,
		minValue: 40,
		maxValue: 250,

		// chart: null,
		bs_env: 'lg',
		dataPoints:100
	},

	//
	// initialize the gauge display
	//
	initialize: function(options) {

		gaugeViewT.template = _.template($("#template-temperature").html());

		//
		// turn defaults into options
		//
		var coptions = _.extend(this.defaults, options);

		coptions.size = 240;
		if (coptions.bs_env==='md')   coptions.size=200;
		if (coptions.bs_env==='sm')   coptions.size=140;
		if (coptions.bs_env==='xs')   coptions.size=160;


		// 
		// stick template into DOM
		// 
		this.$el.html( gaugeViewT.template( {id:coptions.id, gsize: coptions.size, bs_env:coptions.bs_env} ) );

		this.avg = 0;			//this.model.get("currentVal");
		this.avgPoints = 0;
		// this.temps = [];

		//
		// create the gauge
		//
		// var coptions = this.model.get("chart_options");
		gauge = new steelseries.Radial(coptions.id+"-instance", {
			gaugeType: steelseries.GaugeType.TYPE2,
			size: coptions.size,
			threshold: coptions.threshold,
			minValue: coptions.minValue,
			maxValue: coptions.maxValue,
			titleString: coptions.titleString,
			unitString: coptions.unitString,
			pointerType: coptions.pointerType,
			frameDesign: coptions.frameDesign,
			backgroundColor: coptions.backgroundColor
		});


		// 
		// build Highcharts
		// 
		var chart = new Highcharts.Chart(
			this.bldChart(coptions.id+"-graph", '', 'temperature' )
		);


		this.model.set({"gauge":gauge, "chart":chart, "view":this}, {silent:false});


		//
		// listen to changes to model
		//
		this.listenTo(this.model, 'change', this.render);


		// this.render();
	},


	chartAddPoint: function(timestamp, data, redraw) {
		data = parseFloat(data);
		timestamp = parseFloat(timestamp);


		var chart = this.model.get("chart");
		var series = chart.series[0],
			shift = series.data.length >= this.dataPoints;	// shift if the series is 
	                                                 		// longer than 20
		if (typeof redraw === 'undefined')
			redraw = true;

		if (timestamp==0)
			timestamp = (new Date()).getTime(); // current time

		var ret = chart.series[0].addPoint([timestamp, data], redraw, shift);


		// 
		// calc the avg temperature
		// 
		var tot = (this.avg * this.avgPoints) + data;
		this.avgPoints++;
		this.avg = tot / this.avgPoints;

		series = chart.series[1];
		shift = series.data.length >= this.avgPoints;	// shift if the series is 

		chart.series[1].addPoint([timestamp, this.avg], redraw, shift);		
	},


	addHistory: function(history) {
		var view = this.model.get("view");
		_.each(history, function(p){
			p = p.split(",");
			if (p.length == 2)
				view.chartAddPoint(p[0],p[1],false);
		});
		this.model.get('chart').redraw();
	},


	/**
	 *
	 *
	 */
	bldChart: function (renderTo, title, yLabel) {

		var now = (new Date()).getTime(); // current time

		var area_bg_color0 = Highcharts.getOptions().colors[0];
		var area_bg_color1 = Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba');

		var options = {
			chart: {
				renderTo: renderTo,
				zoomType: 'x',
			},
			type: 'line',
			animation: true,
			//marginRight: 10,

			title: { text: title },
			xAxis: {
				type: 'datetime',
				// showFirstLabel:true,
				// showLastLabel:true,
				minRange: 60 * 1000,
				dateTimeLabelFormats: {
					hour: '%H:%M'
				}				
				// tickPixelInterval: 1000
			},
			yAxis: {
				title: { text: yLabel },
				plotLines: [{
					value: 0,
					width: 1,
					color: '#808080'
				}]
			},
			// legend: { enabled: false },
			// exporting: { enabled: false },

            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
                        stops: [
                            [0, area_bg_color0],
                            [1, area_bg_color1]
                        ]
                    },
                    lineWidth: 1,
                    marker: {
                        enabled: false
                    },
                    shadow: false,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                },
				line: {
				    marker: {
				    	enabled: false
					}
				}                
            },
    
			series: [
			{
				type:"area", 
				name:"Temperature", 
				data:[ ]
			},
			{
				type:"line", 
				name:"Average Temperature", 
				data:[  ]
			}]

		};
		return _.clone(options);

	},


	//
	// the temperature value has changed - render it
	//
	render: function() {

		var val = parseFloat(this.model.get('currentVal'));

		// 
		// add some deviation for testing
		// @todo remove this!
		//
		//val = LIB.randomFloatFromInterval(val-1, val+1);

		// 
		// update the gauge
		// 
		this.model.get("gauge").setValueAnimated(val);

		// 
		// update the chart
		// 
		this.chartAddPoint(0,val);

		// bye!
		return this;
	}

});
