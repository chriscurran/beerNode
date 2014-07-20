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

		chart: null,
		dataPoints:40
	},

	//
	// initialize the gauge display
	//
	initialize: function(options) {
		//
		// turn defaults into options
		//
		var coptions = _.extend(this.defaults, options);

		//
		// create the gauge
		//
		this.gauge = new steelseries.Radial(coptions.id, {
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


		// var series = [{name:"Temperature", data:[]}];
		//series.push({name:"graph-data", data:this.generateData(this.dataPoints)});
		var chart = new Highcharts.Chart(
			this.bldChart(coptions.id+"-graph", '', 'temperature' )
		);

		//this.model.set("options", options);
		this.model.set("chart", chart);
		this.model.set("view", this);

		//
		// listen to changes to model
		//
		this.listenTo(this.model, 'change', this.render);
	},


	/**
	 *
	 *
	 */
	generateData: function (cnt) {
		var data = [];
		for (var i=0; i<cnt; i++)
			data.push(0);
		return data;
	},


	chartAddPoint: function(data) {

		var chart = this.model.get("chart");
		var series = chart.series[0],
			shift = series.data.length > this.dataPoints;	// shift if the series is 
	                                                 		// longer than 20
			
		var x = (new Date()).getTime(); // current time
		chart.series[0].addPoint([x, parseFloat(data)], true, shift);
	},


	/**
	 *
	 *
	 */
	bldChart: function (renderTo, title, yLabel) {

		var now = (new Date()).getTime(); // current time

		var options = {
			chart: {renderTo: renderTo},
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
			legend: { enabled: false },
			// exporting: { enabled: false },

            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
                        stops: [
                            [0, Highcharts.getOptions().colors[0]],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
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
                }
            },
    
			series: [{
				type:"area", 
				name:"Temperature", 
				pointInterval: 3600 * 1000,
				pointStart: now,
				data:[ this.model.get("currentVal")]
			}]

		};
		return _.clone(options);

	},


	//
	// the gauge value has changed - render it
	//
	render: function() {
		var val = this.model.get('currentVal');
		this.gauge.setValueAnimated(val);
	}

});



/**
 * SwitchViewT class - a switch viewer for a model
 *
 * uses a Bootstrp button to display state
 */
var SwitchViewT = Backbone.View.extend({
	//
	// the events this switch is listening to
	//
	events: {
		"click" : "toggleState"
	},

	//
	// initialize the switch
	//
	initialize: function() {
		console.log('a new view: '+this.model.get('id'));
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
										  val: this.model.get('currentVal')});
		return this;
	},

	//
	// the switch changed states - render it
	//
	render: function() {
		var state = parseInt(this.model.get('currentVal'));

		var config = this.model.get('config');

		if (state == 1) {
			this.$el.html(config.title+" off");
			this.$el.removeClass('btn-danger').addClass('btn-success');
		}
		else {
			this.$el.html(config.title+" on");
			this.$el.removeClass('btn-success').addClass('btn-danger');
		}

		return this;
	}
});

