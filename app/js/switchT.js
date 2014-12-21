
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
 * switchViewT class - a switch viewer for a model
 *
 * uses a Bootstrp button to display state
 */
var switchViewT = Backbone.View.extend({

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
		switchViewT.template = _.template($("#template-switch").html());

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

		this.$el.html( switchViewT.template( {id:config.name, label:config.title, cls:cls} ) );

		return this;
	}
});

