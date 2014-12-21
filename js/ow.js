/*
MIT License

Copyright (c) 2013 Chris Curran

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

//
// John Resig - Simple JavaScript Inheritance
// http://ejohn.org/blog/simple-javascript-inheritance/
//
require( "./Class.js");
var queueT = require( "./queueT.js");

var fs_ext = require('fs');
var redis = require( "redis");
var redis_client = redis.createClient();

//
// 1-wire base class
//
var OneWireT = Class.extend({
	init: function(name, mode) {
		this.devName = name;		//the device name
		this.devMode = mode;		//the device mode (r, w, rw)
		this.history = null;		//the device read history (memory cache of redis)

		this.timestamps = [];
		this.timestamps['check'] = Date.now();
		this.timestamps['on'] = Date.now();
		this.timestamps['off'] = Date.now();

		try {
			this.fp = fs_ext.openSync(name,mode);
		}
		catch(err) {
			this.fp = null;
			console.log("error opening 1wire device:"+name+" error="+err.message)
		}
	},

	isOpen: function() {
		return (this.fp != null);
	},

	check: function(timestamp) {
		try {
			if (timestamp >= this.timestamps['check']) {
				this.timestamps['check'] = timestamp;
				return true
			}
			return false;
		}
		catch (err) {
			console.log("error checking 1wire device:"+this.name+" error="+err.message)
		}
	},

	setCheckTime: function(timestamp) {
		try {
			this.timestamps['check'] = timestamp;
		}
		catch (err) {
			console.log("error setting check time for 1wire device:"+this.name+" error="+err.message)
		}
	},


	expired: function(slot) {
		try {
			var now = Date.now();
			return (now >= this.timestamps[slot]);
		}
		catch (err) {
			console.log("error checking pid expired:"+err.message)
		}
	},
	
	setExpired: function(slot, val) {
		try {
			this.timestamps[slot] = val; 
		}
		catch (err) {
			console.log("error setting pid timestamp:"+err.message)
		}
	},


	close: function() {
		try {
			if (this.fp != null)
				fs_ext.close(this.fp);
			this.fp = null;
		}
		catch (err) {
			console.log("error closing 1wire device:"+this.name+" error="+err.message)
		}
	},


	get_history: function() {
		if (this.history == null)
			return null;
		return this.history.get_data();
	},

	load_history: function() {
		var self = this;
		redis_client.lrange(this.devName, 0, this.historySize, function(err,res){
			if (err != null)
				console.log(err);
			else {
				// var l = res.len;
				// for(var i=0; i<l; i++) {
				// 	var point = res[i];
				// 	res[i] = point.split(",");
				// }
				self.history.set_data(res);
			}
		}); 	
	},


	read: function() {
		try {
			//fs_ext.seekSync(this.fp,0,0);
			var v = fs_ext.readSync(this.fp, 1024, 0, "UTF-8");		//trim
			return v[0].trim();
		}
		catch(err) {
			console.log("error reading 1wire device:"+this.name+" error="+err.message)
			return '';
		}
	},

	write: function(data) {
		try {
			//fs_ext.seekSync(this.fp,0,0);
			return fs_ext.writeSync(this.fp, data, data.length);
		}
		catch(err) {
			console.log("error writing 1wire device:"+this.name+" error="+err.message)
			return -1;
		}
	}
});


//
// 1-wire base reader class
//
var OneWireReaderT = OneWireT.extend({

	init: function(name) {
		this._super(name,"r");
	}

});


//
// 1-wire base writer class
//
var OneWireWriterT = OneWireT.extend({

	init: function(name) {
		this._super(name,"w");
	}

});

//
// 1-wire base reader/writer class
//
var OneWireReadWriteT = OneWireT.extend({

	init: function(name) {
		this._super(name,"r+");
	}

});


//
//
// 1-wire class to handle switches
//
//
var OneWireSwitchT = OneWireReadWriteT.extend({
	init: function(name) {
		this._super(name);
		this.state = this.read();

		this.on_secs = 0;
		this.off_secs = 0;
	},
	on: function() {
		this.state = 1;
		return this.write("1");
	},
	off: function() {
		this.state = 0;
		return this.write("0");
	},
	getState: function() {
		return this.state;
	}	
});



//
//
// 1-wire class to the DS18x20 temperature sensors
//
//
var OneWire1820 = OneWireT.extend ({

	init: function(name, historySize) {
		this._super(name+"/temperature", "r");

		if (typeof historySize === 'undefined')
			historySize = 100;

		this.historySize = historySize;
		this.history = new queueT(historySize);
		this.load_history();
	},

	push: function(item) {
		var now = (new Date()).getTime(); // current time

		this.history.rpush(now+","+item);

		var self = this;
		redis_client.llen(this.devName, function(err,res) {
			if (res >= self.historySize)
				redis_client.lpop(self.devName);

			redis_client.rpush(self.devName, [now,item]);
		});

	}

});
//module.exports = OneWire1820;
module.exports.OneWire1820 = OneWire1820;


//
//
// 1-wire class to the DS2406 switch (port A)
//
//
var OneWire2406a = OneWireSwitchT.extend ({

	init: function(name) {
		this._super(name+"/PIO.A");
	}

});
module.exports.OneWire2406a = OneWire2406a;

//
//
// 1-wire class to the DS2406 switch (port B)
//
// Note: the TO-92 packaging of the DS2406 does not have a "B" port.
//
var OneWire2406b = OneWireSwitchT.extend ({

	init: function(name) {
		this._super(name+"/PIO.B");
	}

});
module.exports.OneWire2406b = OneWire2406b;


//
//
// 1-wire class for the DS2408 switch
//
//
var OneWire2408 = OneWireSwitchT.extend ({

	init: function(name, channel) {
		if (channel == undefined)
			channel = 0;
		this._super(name+"/PIO."+channel);
	}

});
module.exports.OneWire2408 = OneWire2408;
