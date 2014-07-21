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
	ow = require("./js/ow.js");
	sql = require("./js/sql.js"),
	db = require('./js/db.js'),
	Controller = require('node-pid-controller');

	var app = express();
	// var global = {};

	var	SENSOR_TEMPERATURE	= '1820';		// DS1820 series temperature sensor
	var	SENSOR_SWITCH2		= '2406';		// DS2406 switch, 2 addressable
	var	SENSOR_SWITCH8		= '2408';		// DS2408 switch, 8 addressable


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
	// console.log(global.config);

	console.log("connecting to MySQL server at ", global.config.db.host);
	var connection = db.getConnection();

	//
	// start the server
	//
	var server_http = http.createServer(app).listen(global.config.system.port, function() {
		console.log("beerNode server listening on port " + global.config.system.port);
	});
	global.io = setupSocket(server_http);


	//
	// express stuff
	//

	// 
	// handle index.html special
	// 
	app.get('/', function(req, res){
		filterIndexHTML(req,res);
	});

	app.get('/index.html', function(req, res){
		filterIndexHTML(req,res);
	});

	// 	
	// ajax handler
	// 
	app.post('/ajax', function(req, res){
		ajaxHandler(req,res);
	});

	console.log("__dirname:"+__dirname);
	app.use(express.static(__dirname + '/app'));
	app.use('/js', express.static(__dirname + '/app/js'));
	app.use('/css', express.static(__dirname + '/app/css'));

	//app.use(express.bodyParser());
	app.use(logErrors);
	app.use(errorHandler);

	function logErrors(err, req, res, next) {
		console.error(err.stack);
		next(err);
	}

	function errorHandler(err, req, res, next) {
	  res.status(500);
	  res.render('error', { error: err });
	}



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
	var interval = global.config.system.interval * 1000;
	console.log("interval: "+interval);
	setInterval(function(arg) {
		checkDevices();
	}, interval);



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
// socket events take over from here!
//

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

			fs.readFile(data.fname, 'utf8', function (err, data) {
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
			var dev = findDevice(data.name);
			if (dev == null) {
				console.log('device_set:'+ data.name);
				return;
			}
			deviceSet(dev, data, socket);
		});

		//
		// handler for client 'sql' commands
		//
		socket.on('sql', function(data) {

			// console.log("SQL command:"+ JSON.stringify(data));
			sql.handler(socket,data);

		});


		var cinfo = socket.handshake.address;
		console.log('connection:'+cinfo.address+" id:"+socket.id);

		//
		// When a socket connects, it 'joins' the 'room' of each device, the name
		// of the room being the name of the device.
		//
		for (var deviceName in global.config.devices) {
			var dev = global.config.devices[deviceName];

			socket.join(dev.name);
			console.log("\tjoining room: "+dev.name);
		}

		//
		// tell the client about our devices
		//
		// enumDevices(socket);
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
			obj.history = dev.instance.getHistory();

			deviceList.push(obj);
		}
	}

	//
	// send the deviceList back to the socket that just connected
	//
	//s.emit('device_enum', JSON.stringify(deviceList));
	s.emit('device_enum', deviceList);
}

/**
 * check device list
 */
function checkDevices() {
	var obj = new Object();
	obj.date = new Date();

	//
	// iterate through our device list and check the ones we need to
	//
	for (var deviceName in global.config.devices) {
		var dev = global.config.devices[deviceName];
		if (dev.instance != null) {

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
				var pid = '';
				if (dev.type === SENSOR_TEMPERATURE) {
					pid = "\tpid:"+dev.pid.update(val);
				}
				console.log(dev.name + ": "+obj.val+pid);
			}

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
			if (parseInt(data.val) == 1)
				dev.instance.on();
			else
				dev.instance.off();

			dev.val = dev.lastVal = dev.instance.read();

			var obj = new Object();
			obj.date = new Date();
			obj.name = dev.name;
			obj.type = dev.client_type;
			obj.val = dev.val;
			//global.io.sockets.in(dev.name).emit('device_status', JSON.stringify(obj));
			global.io.sockets.in(dev.name).emit('device_status', obj);

			console.log(clientSocket.id + " set " + dev.name + " to " + dev.val);

			break;
	}
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
			if (device.channel == undefined)
				device.channel = 0;

			device.lastVal = 0;

			device.client_type = getDeviceType(device.type);
			if (device.client_type === "temperature") {				
				device.pid = new Controller(0.25, 0.01, 0.01); // k_p, k_i, k_d
				device.pid.setTarget(device.target);
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
			dev.instance = new ow.OneWire1820(dev.file);
		}
		else if (dev.type == SENSOR_SWITCH2) {
			dev.instance = new ow.OneWire2406a(dev.file, dev.channel);
		}
		else if (dev.type == SENSOR_SWITCH8) {
			dev.instance = new ow.OneWire2408(dev.file, dev.channel);
		}

		if (dev.instance.isOpen() == false)
			process.exit();
	}

	//
	// save a copy of the device list to our config
	//
	global.config.devices = devices;
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
