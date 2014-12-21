/**
 * 
 *
 */
var powerModelT = Backbone.Model.extend({
	defaults: {
		id: '',
		inuse: 0
	},

	initialize: function() {}
});


/**
 * powerViewT class
 *
 */
var powerViewT = Backbone.View.extend({

	tagName:	'div',

	//
	// initialize the switch
	//
	initialize: function() {
		//
		// listen to changes to model
		//
		this.listenTo(this.model, 'change', this.render);

		var chart = new Highcharts.Chart(
			this.bldChart(this.model.get("id"))
		);
		
		this.model.set({"chart":chart, "view":this}, {silent:false});


		this.render();
	},


	/**
	 *
	 *
	 */
	bldChart: function (renderTo) {

		var options = {
			chart: {
				renderTo: renderTo,
				type: 'gauge',

				plotBorderWidth: 1,
				plotBackgroundColor: {
					linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
					stops: [
						[0, '#FFF4C6'],
						[0.3, '#FFFFFF'],
						[1, '#FFF4C6']
					]
				},
				plotBackgroundImage: null,
				height: 124
			},
		
			title: {
				text: null
			},
			
			pane: [{
				startAngle: -45,
				endAngle: 45,
				background: null,
				center: ['52%', '145%'],
				size: 200
			}],	    		        
		
			yAxis: [{
				min: 0,
				max: 30,
				minorTickPosition: 'outside',
				tickPosition: 'outside',
				labels: {
					rotation: 'auto',
					distance: 20
				},
				plotBands: [{
					from: 26,
					to: 30,
					color: '#C02316',
					innerRadius: '100%',
					outerRadius: '105%'
				},{
					from: 20,
					to: 26,
					color: 'orange',
					innerRadius: '100%',
					outerRadius: '105%'
				}                        
				],
				pane: 0,
				title: {
					text: 'AMPS',
					y: -20
				}
			}],
			
			plotOptions: {
				gauge: {
					dataLabels: {
						enabled: false
					},
					dial: {
						radius: '100%'
					}
				}
			},				
		
			series: [{
				data: [0],
				yAxis: 0
			}]

		};

		return _.clone(options);

	},


	//
	// the switch changed states - render it
	//
	render: function() {
		var json = this.model.toJSON();

		var chart = json.chart;
		var points = chart.series[0].points[0];

		points.update(json.inuse);


		// this.$el.html( powerViewT.template(json) );


		return this;
	}
});

