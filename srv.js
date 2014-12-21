#!/usr/local/bin/node

/**
 * beerNode
 *
 * A Node.js 1Wire server
 *
 * @version	1.0
 * @copyright(c) 2013 Chris Curran
 *	See the file license.txt for copying permission.
 *
 */

/**
 * start of app
 */
var express = require('express'),
	socket_io = require('socket.io'),
	http = require('http'),
	fs = require('fs'),
	util = require('util'),
	iniparser = require('iniparser'),
	_ = require("underscore"),
	ow = require("./js/ow.js"),
	pidT = require('./js/pidT.js'),
	powerT = require('./js/powerT.js');

	// sql = require("./js/sql.js"),
	// db = require('./js/db.js'),


	var app = express();

	var	SENSOR_TEMPERATURE	= '1820';		// DS1820 series temperature sensor
	var	SENSOR_SWITCH2		= '2406';		// DS2406 switch, 2 addressable
	var	SENSOR_SWITCH8		= '2408';		// DS2408 switch, 8 addressable
	var	SENSOR_GPIO			= 'GPIO';		// GPIO on the Raspberry Pi, 8 addressable


	// 
	// setup underscore template engine to use mustache style markers
	// 
	_.templateSettings = {
		evaluate:       /\{\{#([\s\S]+?)\}\}/g,             // {{# console.log("blah") }}
		interpolate:    /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,   // {{ title }}
		escape:         /\{\{\{([\s\S]+?)\}\}\}/g           // {{{ title }}}
	}


	//
	// load the config.ini file
	//
	doConfig();

	global.threads = [];
	global.override = false;

	// 
	// connect to mysql
	// 
	// console.log("connecting to MySQL server at ", global.config.db.host);
	// var connection = db.getConnection();

	//
	// start the server
	//
	var server_http = http.createServer(app).listen(global.config.system.port, function() {
		console.log("beerNode server listening on port " + global.config.system.port);
	});
	global.io = setupSocket(server_http);

	global.power = new powerT(global.config.maxAmps, global.io.sockets);		//30 amps max



	//
	// express stuff
	//

	// 
	// handle index.html special
	// 
	app.get('/', function(req, res)				{ filterIndexHTML(req,res);	});
	app.get('/index.html', function(req, res)	{ filterIndexHTML(req,res);	});

	// 	
	// ajax handler
	// 
	app.post('/ajax', function(req, res){
		ajaxHandler(req,res);
	});

	// 
	// create routes
	// 
	console.log("__dirname:"+__dirname);
	app.use(express.static(__dirname + '/app'));
	app.use('/js', express.static(__dirname + '/app/js'));
	app.use('/css', express.static(__dirname + '/app/css'));

	// 
	// setup express error handling
	// 
	app.use(logErrors);
	app.use(errorHandler);

	// 
	// express error logger
	// 
	function logErrors(err, req, res, next) {
		console.error(err.stack);
		next(err);
	}

	// 
	// express error handler
	// 
	function errorHandler(err, req, res, next) {
	  res.status(500);
	  res.render('error', { error: err });
	}


	//
	// Filter index.html for "{{ server }}" tags and replace that with the 
	// current ip of the host we're running on. Otherwise, you have to hard-code
	// the node server ip in your index.html - not ideal.
	// 	
	function filterIndexHTML(req, res) {
	    console.log("filterIndexHTML req.url:"+req.url);

		fs.readFile('./app/index.html', 'utf8', function (err, data) {
			if (err) {
				console.log('404 Error:'+err);
				res.writeHead(404);
				return res.end('404 Error loading index.html');
			}

			var server = global.config.system.server + ':' + global.config.system.port;
			data = _.template(data,	{server:server});

			res.writeHead(200);
			res.end(data);
		});
	}

	//
	// check the device list once every (global.config.system.interval) seconds
	//
	var interval = 1000;
	setInterval(function(arg) {
		timeSlice();
	}, interval);


	// 
	// toodles... we're running - handlers take over from here.
	// 

/**
 * process a time slice
 */
function timeSlice() {
	checkDevices();

	processThreads();
}


/**
 * process a thread
 */
function processThreads() {

	//
	// iterate through our device list and check the ones we need to
	//
	for (var deviceName in global.config.devices) {

		var dev = global.config.devices[deviceName];
		if (dev.instance != null && dev.type === SENSOR_TEMPERATURE) {
			// 
			// this is a temp sensor - does it control anything?
			// 
			if (typeof dev.controls !== 'undefined') {
				// it does, it does!
				var controlled = findDevice(dev.controls);
				if (controlled != null && controlled.override==false && global.override==false) {
					// 
					// OK, the sensor is controlling something, we found it, and the two overrides are off.
					// 
					var val = parseFloat(dev.lastVal);
					switch (dev.method) {
						case "pid":
							var now = Date.now();
							if (controlled.instance.getState() == 1) {
								if ( dev.instance.expired('on') ) {
									// on slice has expired.
									if (dev.instance.off_secs > 0) {
										// turn switch off
										controlled.instance.off();
										controlled.lastVal = 0;
										broadcastDeviceState(controlled);
										global.power.release(controlled.name);
									}
									calcPID(dev, val);
								}
							}
							else {
								// switch is off
								// check to see if off time slice has expired
								if ( dev.instance.expired('off') ) {
									// off slice has expired.
									// calc new on/off slice values
 									calcPID(dev, val);

									// turn switch on
									if (dev.instance.on_secs > 0) {
										if (global.power.reserve(controlled.name,controlled.amps)) {
											controlled.instance.on();
											controlled.lastVal = 1;
											broadcastDeviceState(controlled);
										}
									}

								}

							}							
							break;

						case "range":
							if (val < dev.rangeLow) {
								// 
								// we're below range
								// 
								if (dev.cooling == false) {
									// 
									// heater circuit
									// 
									if (controlled.instance.getState() == 0) {
										if (global.power.reserve(controlled.name,controlled.amps)) {
											controlled.instance.on();
											controlled.lastVal = 1;
											broadcastDeviceState(controlled);
											console.log("thread range on: "+controlled.name);
										}
									}
								}
								else {
									// 
									// cooling circuit
									// 
									if (controlled.instance.getState() == 1) {
										controlled.instance.off();
										global.power.release(controlled.name);
										controlled.lastVal = 0;
										broadcastDeviceState(controlled);
										console.log("thread range off: "+controlled.name);
									}
								}
							}
							else if (val > dev.rangeHigh) {
								// 
								// we're above range
								// 
								if (dev.cooling == false) {
									// 
									// heater circuit
									// 
									if (controlled.instance.getState() == 1) {
										controlled.instance.off();
										global.power.release(controlled.name);
										controlled.lastVal = 0;
										broadcastDeviceState(controlled);
										console.log("thread range off: "+controlled.name);
									}
								}
								else {
									if (controlled.instance.getState() == 0) {
										if (global.power.reserve(controlled.name,controlled.amps)) {
											controlled.instance.on();
											controlled.lastVal = 1;
											broadcastDeviceState(controlled);
											console.log("thread range on: "+controlled.name);
										}
									}
								}
							}
							break;
					}
				}
			}

		}

	}


}


function calcPID(dev, val) {
	var now = Date.now();
	var WINDOW_SECS = 10;

	var pid = dev.pid.update(val);
	pid = Number((pid).toFixed(2));

	if (val >= dev.target)
		pid = 0;

	var di = dev.instance;
	di.on_secs = (WINDOW_SECS * pid).toFixed(0);	// how many seconds of WINDOW_SECS to stay on
	di.off_secs = WINDOW_SECS-di.on_secs;			// how many seconds of WINDOW_SECS to stay off

	di.onTarget = (di.on_secs*1000)+now;
	di.offTarget = (di.off_secs*1000)+di.onTarget;

	di.setExpired('on',  di.onTarget);
	di.setExpired('off', di.offTarget);

	console.log("device:"+dev.name+" val:"+val.toFixed(2)+" pid:"+dev.pid.getHighResPID()+" on:"+dev.instance.on_secs+" off:"+dev.instance.off_secs+" lastError:"+dev.pid.lastError.toFixed(2)+" sumError:"+dev.pid.sumError.toFixed(2));
}


// 
//  ajax handler
// 
function ajaxHandler(req, res) {
try {

	var parms = _.clone(req.body);
	var cmd = (typeof parms.cmd === 'undefined') ? '411':parms.cmd;

	var obj = {
		errCode: 200,
		errText: "OK",
		data: null
	}

	switch(cmd) {
		case "echo":
			obj.data = parms;
			break;

		case "411":
			obj.errCode = 411;
			obj.errText = "Unknown command:"+cmd;
			obj.data = parms;
			break;
	}

	res.contentType('json');
	res.send(obj);

} catch(err) {
	res.contentType('json');
	res.send({ errCode: 500, errText: "AJAX ERROR"});
}}


//
// socket code
//
function setupSocket(server_obj) {

	var io = socket_io.listen(server_obj);

	io.configure(function() {
		io.set("log level", 1);

		io.set('flash policy port', 843);

		io.enable('browser client minification');  // send minified client
		io.enable('browser client etag');          // apply etag caching logic based on version number
		io.enable('browser client gzip');          // gzip the file

		io.set('transports', ['websocket','flashsocket']);
	});


	io.sockets.on('connection', function (socket) {
		//
		// we've lost the client connection
		//
		socket.on('disconnect', function (clientSocket) {
			var cinfo = socket.handshake.address;
			console.log('client disconnect:'+cinfo.address);
		});


		//
		// handler for templates
		//
		socket.on('load_templates', function(data) {

			var fname = (typeof data.fname === 'undefined') ? global.config.system.template:data.fname;
			fname = global.config.system.templatePath + fname;

			fs.readFile(fname, 'utf8', function (err, data) {
				if (err) {
					console.log('500 Error loading file:'+err);
					socket.emit('load_templates', {errCode:500, errText:err});
					return;
				}

				socket.emit('load_templates', {errCode:200, errText:"OK", data:data});
			});

		});


		//
		// handler for device enumeration
		//
		socket.on('device_enum', function(data) {

			enumDevices(socket);

		});


		//
		// handler for client 'set' commands
		//
		socket.on('device_set', function(data) {
			//dump(data);
			if (data.name === 'all') {
				globalSet(data.val);
			}
			else if (global.override == false) {
				var dev = findDevice(data.name);
				if (dev == null) {
					console.log('error device_set:'+ data.name);
					return;
				}
				deviceSet(dev, data, socket);
			}
		});

		//
		// handler for client 'config' commands
		//
		socket.on('device_config', function(data) {
			// console.log("---------------");
			// dump(data);

			var dev = findDevice(data.name);
			if (dev == null) {
				console.log('error device_config:'+ data.name);
				return;
			}

			dev.method = (typeof data.method === 'undefined') ? dev.method:data.method;
			dev.override = (typeof data.override === 'undefined') ? dev.override:data.override;

			if (typeof dev.controls !== 'undefined') {
				var control_target = findDevice(dev.controls);
				if (control_target !== null) {
					control_target.override = dev.override;
				}
			}


			dev.rangeLow = (typeof data.rangeLow === 'undefined') ? dev.rangeLow:parseFloat(data.rangeLow);
			dev.rangeHigh = (typeof data.rangeHigh === 'undefined') ? dev.rangeHigh:parseFloat(data.rangeHigh);

			dev.kp = (typeof data.kp === 'undefined') ? dev.kp:parseFloat(data.kp);
			dev.ki = (typeof data.ki === 'undefined') ? dev.ki:parseFloat(data.ki);
			dev.kd = (typeof data.kd === 'undefined') ? dev.kd:parseFloat(data.kd);
			dev.target = (typeof data.target === 'undefined') ? dev.target:parseFloat(data.target);
			
			dev.pid.setKP(dev.kp);
			dev.pid.setKI(dev.ki);
			dev.pid.setKD(dev.kd);
			dev.pid.setTarget(dev.target);

			console.log("config " + dev.name + " (override="+dev.override+")");

		});


		//
		// handler for client 'sql' commands
		//
		/*
		socket.on('sql', function(data) {

			// console.log("SQL command:"+ JSON.stringify(data));
			sql.handler(socket,data);

		});
		*/


		var cinfo = socket.handshake.address;
		console.log('connection:'+cinfo.address+" id:"+socket.id);

		//
		// When a socket connects, it 'joins' the 'room' of each device, the name
		// of the room being the name of the device.
		//
		socket.join("__all__");
		for (var deviceName in global.config.devices) {
			var dev = global.config.devices[deviceName];

			socket.join(dev.name);
			console.log("\tjoining room: "+dev.name);
		}

		//
		// tell the client about our devices
		//
		showClients();
	});

	return io;
}


/**
 * We have a new connection - send the list of devices to the client
 *
 * @param	socket	s		the socket that just connected to us
 *
 * @return	nothing
 */
function enumDevices(s) {

	var deviceList = [];
	for (var deviceName in global.config.devices) {
		var dev = global.config.devices[deviceName];

		if (dev.instance != null) {
			var obj = new Object();

			obj.date = new Date();
			obj.name = dev.name;
			obj.type = dev.client_type;
			obj.config = dev;

			obj.val = dev.instance.read();
			obj.history = dev.instance.get_history();

			deviceList.push(obj);
		}
	}

	//
	// send the deviceList back to the socket that just connected
	//
	s.emit('device_enum', deviceList);
}

/**
 * check device list
 */
function checkDevices() {
	var obj = new Object();
	obj.date = new Date();

	var now = Date.now();

	//
	// iterate through our device list and check the ones we need to
	//
	for (var deviceName in global.config.devices) {
		var dev = global.config.devices[deviceName];
		if (dev.instance != null && dev.instance.check(now)) {

			dev.instance.setCheckTime(now+(global.config.system.interval*1000));

			var val = dev.instance.read();
			if (val != dev.lastVal) {
				//
				// device value has changed; record it.
				//
				dev.lastVal = val;

				//
				// prepare object to be sent to all clients of this device
				//
				obj.name = dev.name;
				obj.type = dev.client_type;
				obj.val = val;

				//
				// When a socket connects, it 'joins' the 'room' of each device, the name
				// of the room being the name of the device. So, to let all clients know
				// a device change, sent a message to that room - socket.io handles the rest.
				//
				//global.io.sockets.in(dev.name).emit('device_status', JSON.stringify(obj));
				global.io.sockets.in(dev.name).emit('device_status', obj);

				//
				// log device change to server screen
				//
				if (dev.type === SENSOR_TEMPERATURE) {
					dev.instance.push(val);
				}
				console.log(dev.name + ": "+obj.val);
			}

		}
	}
}

/**
 *
 */
function globalSet(state) {

	state = parseInt(state);
	global.override = (state==0) ? true:false;
	console.log("set global override state:"+global.override);

	global.io.sockets.in("__all__").emit('device_status',{date:new Date(), name:"all", type:"system", val:state});

	for (var deviceName in global.config.devices) {
		var dev = global.config.devices[deviceName];

		if (typeof dev.instance === 'undefined')
			continue;
		
		switch(dev.type) {
			case SENSOR_SWITCH2:
			case SENSOR_SWITCH8:
				if (state==0) {
					// 
					// global run state is OFF, turn device off
					// 
					dev.instance.off();
					dev.lastVal = 0;
					broadcastDeviceState(dev);
				}
				break;
		}

	}

}


/**
 *
 */
function deviceSet(dev, data, clientSocket) {

	console.log(data.name + ' device_set:'+ data.val);
	switch(dev.type) {
		case SENSOR_TEMPERATURE:
			//can't write to a 1820
			break;

		case SENSOR_SWITCH2:
		case SENSOR_SWITCH8:

			val = parseInt(data.val);
			if (val == 1) {
				if (global.power.reserve(dev.name, dev.amps)) {
					dev.instance.on();
				}
			}
			else {
				dev.instance.off();
				global.power.release(dev.name);
			}

			dev.val = dev.lastVal = dev.instance.read();

			// 
			// if this device is being controlled by a temp sensor, we want
			// to set a 'override' flag to keep the auto on/off from happening
			//
			// if (typeof dev.controlledBy !== 'undefined') {
			// 	dev.override = !(val == 1);
			// 	// dev.override = true;
			// }
			// else {
			// 	dev.override = false;
			// }

			broadcastDeviceState(dev);
			console.log(clientSocket.id + " set " + dev.name + " to " + dev.val + " (override="+dev.override+")");
			break;
	}
}

function broadcastDeviceState(dev) {

	var obj = new Object();

	obj.date = new Date();
	obj.name = dev.name;
	obj.type = dev.client_type;
	obj.val  = dev.lastVal;
	
	global.io.sockets.in(dev.name).emit('device_status', obj);
}

//
// load config and start 'rooms' for each device
//
function doConfig() {

	global.config = iniparser.parseSync('./config.ini');
	// console.log(global.config);

	//
	// build the list of devices
	//
	var devices = [];
	for (var entryName in global.config) {
		if (global.config.hasOwnProperty(entryName)) {

			if (entryName === 'system' || entryName === 'db')
				continue;

			var device = global.config[entryName];
			device.name = entryName;
			device.instance = null;
			if (typeof device.channel === 'undefined')
				device.channel = 0;

			device.lastVal = 0;
			device.override = false;

			device.client_type = getDeviceType(device.type);
			if (device.client_type === "temperature") {
				device.historySize = (typeof device.historySize === 'undefined') ? 100:parseInt(device.historySize);
				
				// device.pid = null;
				device.method = (typeof device.method === 'undefined') ? "range":device.method.toLowerCase();

				if (typeof device.kp === 'undefined') 	device.kp = 0.20;
				if (typeof device.ki === 'undefined') 	device.ki = 0.01;
				if (typeof device.kd === 'undefined') 	device.kd = 0.01;
				device.kp = parseFloat(device.kp);
				device.ki = parseFloat(device.ki);
				device.kd = parseFloat(device.kd);
				device.pid = new pidT(device.kp, device.ki, device.kd); // k_p, k_i, k_d
				device.pid.setTarget(device.target);

				if (typeof device.rangeLow === 'undefined') 	device.rangeLow = 50;
				if (typeof device.rangeHigh === 'undefined') 	device.rangeHigh = device.rangeLow*2;
				device.rangeLow = parseFloat(device.rangeLow);
				device.rangeHigh = parseFloat(device.rangeHigh);

				device.cooling = (device.cooling === 'yes') ? true:false;

			}
			else if (device.client_type === "switch") {
				device.amps = (typeof device.amps === 'undefined') ? 0:parseInt(device.amps);
			}

			devices[entryName] = device;
		}
	}


	//
	// create 1Wire instances for our devices
	//
	for (var deviceName in devices) {
		var dev = devices[deviceName];
		if (dev.type == SENSOR_TEMPERATURE) {
			dev.instance = new ow.OneWire1820(dev.file, dev.historySize);
		}
		else if (dev.type == SENSOR_SWITCH2) {
			dev.instance = new ow.OneWire2406a(dev.file, dev.channel);
			dev.instance.off();
			dev.amps = (typeof dev.amps == 'undefined') ? 1:dev.amps;
		}
		else if (dev.type == SENSOR_SWITCH8) {
			dev.instance = new ow.OneWire2408(dev.file, dev.channel);
			dev.instance.off();
			dev.amps = (typeof dev.amps == 'undefined') ? 1:dev.amps;
		}

		if (typeof dev.instance === 'undefined' || dev.instance.isOpen() == false) {
			console.log("Failed to open:"+dev.name)
			process.exit();
		}

	}

	//
	// save a copy of the device list to our config
	//
	global.config.devices = devices;


	//
	// create self references for the "controlled by" temperature devices
	//
	for (var deviceName in devices) {
		var dev = devices[deviceName];
		if (typeof dev.controls !== 'undefined') {
			var control_target = findDevice(dev.controls);
			if (control_target == null) {
				console.log("Device config error matching "+deviceName+" 'controls' for "+dev.controls)
				process.exit();
			}
			control_target.controlledBy = dev.name;
			dev.controlledObj = control_target;
		}
	}


}


/**
 *
 *
 */
function getDeviceType(type) {
 	switch(type) {
		case SENSOR_TEMPERATURE:
			return "temperature";
		case SENSOR_SWITCH2:
		case SENSOR_SWITCH8:
			return "switch";
	}
	return "unknown";
}


/**
 * show all client ip's for each device
 *
 */
function showClients() {

	for (var deviceName in global.config.devices) {
		console.log("device: "+deviceName);

		var clients = global.io.sockets.clients(deviceName);
		clients.forEach(function(s) {
			var cinfo = s.handshake.address;
			console.log("\tclient: "+cinfo.address+ " id:"+s.id);
		});
	}
}

function findDevice(name) {

	for (var deviceName in global.config.devices) {
		if (deviceName === name)
			return global.config.devices[deviceName];

	}
	return null;
}

function dump(obj) {

	for (var entryName in obj) {
		if (obj.hasOwnProperty(entryName)) {

			//var s = obj[entryName];
			//console.log("%s, %s", entryName, s);

			console.log("%s", entryName);
			console.log(obj[entryName]);
		}
	}

}
