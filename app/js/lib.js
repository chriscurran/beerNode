var LIB = LIB || {};

/**
 * post an ajax request to the server
 *
 */
LIB.post = function(_cmd, _parms, _callback) {
	if (typeof _callback === 'undefined') {
		 _callback = null;
	}	

	_parms.cmd = _cmd;

	//
	// fire off the request to script handler
	//
	var request = $.ajax({
		url: "ajax",
		type: "post",
		contentType: 'application/json',
		data: JSON.stringify(_parms)
	});

	//
	// callback handler that will be called on success
	//
	request.done(function (response, textStatus, jqXHR){
		try {
			if (_callback != null) {
				var arg = (typeof _callback.arg === 'undefined') ? null:_callback.arg;

				_callback.success(response,arg);
			}
		}
		catch (e) {
			console.log(response);
			alert("Fatal error:" + e.message);
			return;
		}
	});

	//
	// callback handler that will be called on failure
	//
	request.fail(function (jqXHR, textStatus, errorThrown){
		if (_callback != null) {
			if (typeof _callback.failure !== 'undefined')
				_callback.failure(jqXHR);
		}
	});

	//
	// callback handler that will be called regardless
	// if the request failed or succeeded
	//
	request.always(function () {
		if (_callback != null) {
			if (typeof _callback.always !== 'undefined')
				_callback.always();
		}
	});

}



/** 
 *
 *
 */
LIB.confirm = function(options, callBack) {

	options = $.extend({title:"", content:"content", goButton:"Save", candy: true, class:"bootbox-medium"}, options);

	LIB.bootbox = bootbox.dialog({
		title: options.title,
		message: options.content,
		animate: options.candy,
		closeButton: false,
		className: options.class,
		buttons: {
			
			success: {
				"label": options.goButton,
				"className": "btn-primary btn-left",
				"callback": function() {	
						if (typeof callBack !== 'undefined')
							return callBack(true);
						else
							return true;
				}
			},

			cancel: {
				"label": "Cancel",
				"className": "btn btn-left",
				"callback": function() {	
						if (typeof callBack !== 'undefined')
							return callBack(false);
						else
							return true;
				}

			}

		}
	});

}



/**
 * 
 */
LIB.fieldType = function(type) {
	switch (type) {
		case 'control_temp':	return "Temperature control";
		case 'control_switch':	return "Switch control";
		case 'control_timer':	return "Timer control";
		case 'control_pause':	return "Pause control";
		default:				return "???";
	}
}


LIB.randomIntFromInterval = function(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}


LIB.randomFloatFromInterval = function(min,max) {
	var precision = 2;
	return parseFloat(Math.min(min + (Math.random() * (max - min)),max).toFixed(precision));
}



