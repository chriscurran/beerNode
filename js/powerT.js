/**
 *  Power regulating controller.
 */
var _ = require("underscore");

var queueT = require("./queueT.js");

var powerT = function(max_amps, sockets) {
	if (typeof max_amps === 'undefined')
		max_amps = 15;

	this.debug = true;
	
	this.max_amps = max_amps;
	
	this.inuse = 0;
	this.who = new queueT();
	this.sockets = sockets;
};

powerT.prototype.reserve = function(who,amps) {
	
	// would this put us over our max amps?
	if (amps + this.inuse > this.max_amps)
		return false;

	// adjust our inuse amount
	this.inuse += amps;

	// store who and amps into a fifo queue
	this.who.lpush({who:who, amps:amps});

	// broadcast to everyone the new power state
	this.sockets.in("__all__").emit('power', {cmd:'reserve', who:who, amps:amps, inuse:this.inuse});

	if (this.debug)
		console.log("reserved: "+who+", amps:"+amps+", in use:"+this.inuse);

	return true;
};


powerT.prototype.release = function(who) {
	
	var data = this.who.get_data();
	var w, l = data.length;
	for (var i=0; i<l; i++) {
		w = data[i];
		if (w.who === who) {
			this.who.del_idx(i);
			
			// adjust our inuse amount
			this.inuse -= w.amps;

			this.sockets.in("__all__").emit('power', {cmd:'release', who:w.who, amps:w.amps, inuse:this.inuse});

			if (this.debug)
				console.log("released "+who+", amps:"+w.amps+", now in use:"+this.inuse);

			break;	//stop iterating
		}
	}

	return true;
};

module.exports = powerT;
