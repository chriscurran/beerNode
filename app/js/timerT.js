/**
 * base device class
 *	http://keith-wood.name/countdownRef.html
 */
var timerModelT = Backbone.Model.extend({
	defaults: {
		id: '',
		alarms: null,
		duration: "1h"			// 1 hour
	},

	initialize: function() {
		this.set("alarms", []);
	}
});



/**
 * timerViewT class
 *
 */
var timerViewT = Backbone.View.extend({

	tagName:	'div',

	//
	// the events this switch is listening to
	//
	events: {
		"click .timer-settings" : "timerSettings",
		"click .timer-toggle" 	: "timerToggle"
	},

	//
	// initialize the switch
	//
	initialize: function() {
		timerViewT.template = _.template($("#template-timer").html());

		var baseid = this.model.get("id");
		this.id_timer = "#" + baseid+"_instance";
		this.id_toggle = "#" + baseid+"_toggle";
		this.id_settings = "#" + baseid+"_settings";

		//
		// listen to changes to model
		//
		this.listenTo(this.model, 'change', this.render);

		//this.render();
		this.model.set("view", this, {silent:true});	//self referencing

		// var expire = "+" + this.model.get("duration");
		// this.model.set("expire", expire);	
		this.setDuration(this.model.get("duration"));
	},

	// 
	// timer settings popup
	// 
	calcMinsLeft: function() {
		var device = this.model;
		var json = device.toJSON();

		var periods = $(this.id_timer).countdown('getTimes');

		json.minsLeft = '';
		if (periods[4] > 0) {	//hours
			json.minsLeft += (periods[4]+"h ");
		}

		if (periods[5] > 0) {	//mins
			json.minsLeft += (periods[5]+"m ");
		}

		if (periods[6] > 0) {	//seconds
			json.minsLeft += (periods[6]+"s ");
		}

		if (json.minsLeft === '')
			json.minsLeft = json.duration;

		device.set('minsLeft', json.minsLeft, {silent:true});
	},

	// 
	// timer settings popup
	// 
	timerSettings: function() {
		debugger;
		this.calcMinsLeft();

		var device = this.model;
		var json = device.toJSON();

		var html = _.template($("#template-timer-settings").html(), json);
		LIB.confirm({content:html, title:"Timer settings", class:"bootbox-medium bootbox-alarms"}, function(result) {
			var view = device.get('view');

			if (result) {
				$(view.id_toggle).prop("disabled",false);			
				$(view.id_toggle).addClass("btn-primary");
				$(view.id_settings).removeClass("btn-primary");

				var val = $("#timer-duration").val();
				if (val !== '') {
					view.setExpire(val);
				}

				return true;
			}
		});

		var self = this;
		LIB.bootbox.on('shown.bs.modal',function(){

			$(".alarm-add-row").click(function(){
				debugger;
				var alarms = self.model.get("alarms");
				var alarm = addAlarmRow(null,0);
				alarms.push(alarm);
				
				//self.model.set("alarms", alarms, {silent:true});
				// self.render();
				
				self.calcMinsLeft();
				var html = _.template($("#template-timer-settings").html(), self.model.toJSON());
				
				$(".bootbox-alarms .bootbox-body").html(html);
			});
			
		});



	},


	// 
	// timer toggle
	// 
	timerToggle: function() {
		// 
		// toggle the run state of the timer
		// 
		var btnText = $(this.id_toggle).text();

		$(this.id_toggle).removeClass("btn-primary");
		$(this.id_toggle).removeClass("btn-danger");
		$(this.id_toggle).removeClass("btn-success");
		
		if (btnText === 'Pause') {
	    	// 
	    	// pause the timer
	    	// 
	    	$(this.id_timer).countdown('pause'); 

	    	$(this.id_toggle).html('Resume'); 
	    	$(this.id_toggle).addClass("btn-danger");

	    	$(this.id_settings).prop("disabled",false);
	    }
	    else {
	    	// 
	    	// start the running
	    	// 
	    	$(this.id_timer).countdown('resume'); 

	    	$(this.id_toggle).html('Pause'); 
	    	$(this.id_toggle).addClass("btn-success");

	    	$(this.id_settings).prop("disabled",true);
	    }

	},

	// 
	// 
	// 
	addAlarm: function(when) {
		debugger;
	},


	// 
	// 
	// 
	setDuration: function(duration, silent) {
		if (typeof silent==='undefined')
			silent=false;

		this.model.set("duration", duration, {silent:true});

		this.setExpire(duration, silent);
	},

	// 
	// 
	// 
	setExpire: function(expire, silent) {
		if (typeof silent==='undefined')
			silent=false;

		expire = "+" + expire;

		$(this.id_timer).countdown('option','until',expire); 
		$(this.id_timer).countdown('pause');			// stop timer

		this.model.set("expire", expire, {silent:silent});
	},

	//
	// the switch changed states - render it
	//
	render: function() {
		var json = this.model.toJSON();

		this.$el.html( timerViewT.template(json) );

		$(this.id_timer).data("model",this.model);


		// var id_timer = "#" + this.model.get("id")+"_instance";
		$(this.id_timer).countdown({
			until: json.expire, 
			format:"MHS",
			padZeroes: true,
			// expiryText: "<i><b>time expired</b></i>",
			onExpiry: function(ev) {
				debugger;
				var mdl = $("#"+this.id).data("model");
				var view = mdl.get("view");

				$(view.id_toggle).html('Start'); 
				$(view.id_toggle).prop("disabled",true);
				
				$(view.id_toggle).removeClass("btn-danger");
				$(view.id_toggle).removeClass("btn-success");

				$(view.id_settings).prop("disabled",false);
				$(view.id_settings).addClass("btn-primary");

				bootbox.alert("done");
			}
		});
		$(this.id_timer).countdown('pause');			// start with timer not running

		return this;
	}
});

