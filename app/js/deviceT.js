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

	// 
	// constructor
	// 
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
 * device collection type
 */
var deviceCollectionT = Backbone.Collection.extend({
	model: deviceModelT
});

