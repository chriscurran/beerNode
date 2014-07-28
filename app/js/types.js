/**
 * beerNode data types
 *
 */

/**
 *  global event aggregator
 */
var ioEvents = _.extend({}, Backbone.Events);
Backbone.Model.prototype.ioEvents = ioEvents;


/**
 * base device class
 *
 */
var deviceModelT = Backbone.Model.extend({
	defaults: {
		id: '',
		config: '',
		currentVal: 0
	},

	initialize: function() {
		
		var config = this.get('config');

		if (config === 'undefined' || config === '') 
			this.set('config', {}, {silent:true});

		if (typeof config.title === 'undefined') 
			config.title = config.name;

		//
		this.set('currentVal', parseFloat(config.lastVal), {silent: true});

		//
		// monitor global ioEvents aggregator for 'change' events
		//
		this.ioEvents.on('change', function(device){
			
			if (this.id === device.name) {

				this.set('currentVal', device.val)
				dsp(device.name + " type:"+ device.type + "\tvalue:"+ device.val + "\t\tdate:"+ device.date);

			}

		}, this);
	}
});


/**
 * switch device class
 *
 */
var switchModelT = deviceModelT.extend({
	toggle: function() {
		var state = (parseInt(this.get('currentVal'))==0) ? 1:0;
		this.set('currentVal', state);
	}
});

/**
 * device collection type
 */
var deviceCollectionT = Backbone.Collection.extend({
	model: deviceModelT
});



/**
 * GaugeViewT class - a gauge viewer for a model
 *
 * uses https://github.com/HanSolo/SteelSeries-Canvas to display gauges
 */
var GaugeViewT = Backbone.View.extend({
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

		GaugeViewT.template = _.template($("#template-temperature").html());

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
		this.$el.html( GaugeViewT.template( {id:coptions.id, gsize: coptions.size, bs_env:coptions.bs_env} ) );

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

		chart.series[0].addPoint([timestamp, data], redraw, shift);


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




/**
 * SwitchViewT class - a switch viewer for a model
 *
 * uses a Bootstrp button to display state
 */
var SwitchViewT = Backbone.View.extend({

	tagName:	'div',

	//
	// the events this switch is listening to
	//
	events: {
		"click .beernode-switch" : "toggleState"
	},

	//
	// initialize the switch
	//
	initialize: function() {
		SwitchViewT.template = _.template($("#template-switch").html());

		// console.log('a new view: '+this.model.get('id'));

		//
		// listen to changes to model
		//
		this.listenTo(this.model, 'change', this.render);
	},

	//
	// toggle the state of a switch
	//
	toggleState: function() {
		this.model.toggle();

		global.server.emit("device_set", {name: this.model.get('id'),
										  val: this.model.get('currentVal')	});
		return this;
	},

	//
	// the switch changed states - render it
	//
	render: function() {
		var state = parseInt(this.model.get('currentVal'));
		var config = this.model.get('config');
		var cls = (state == 1) ? "btn-success":"btn-danger";

		this.$el.html( SwitchViewT.template( {id:config.name, label:config.title, cls:cls} ) );

		return this;
	}
});

