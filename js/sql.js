
var  db = require('./db.js');

var  _ = require('underscore');

	// 
	// setup underscore template engine to use mustache style markers
	// 
	_.templateSettings = {
		evaluate:       /\{\{#([\s\S]+?)\}\}/g,             // {{# console.log("blah") }}
		interpolate:    /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,   // {{ title }}
		escape:         /\{\{\{([\s\S]+?)\}\}\}/g           // {{{ title }}}
	}



module.exports.handler = function(socket, data) {

	// console.log("SQL handler:"+ JSON.stringify(data));

	switch (data.cmd) {

		case 'load_profile':
			this.load_profile(socket, data);
			break;
	
		case 'save_profile':
			this.save_profile(socket, data);
			break;

	}

}



module.exports.load_profile = function(socket, data) {

	var conn = db.getConnection();

	//
	// perform the sql
	//
	var sql = 'SELECT * FROM profiles WHERE profile_id='+conn.escape(data.profile_id)+';';
	// console.log(sql);
	conn.query(sql, function (error, rows, fields) {
		if (error != null)
			console.log("ERROR",error);
		else {
			var h = rows[0];

			// no error, get fields now
			var sql = 'SELECT * FROM controls WHERE profile_id='+conn.escape(data.profile_id)+' ORDER BY field_order;';
			// console.log(sql);

			conn.query(sql, function (error, rows, fields) {
				if (error != null)
					console.log("ERROR",error);
				else {
					// no error
					socket.emit('load_profile', JSON.stringify({header:h, body:rows}));
					// console.log("OK!");
				}
			});
		}
	});

	return true;
}




module.exports.save_profile = function(socket, data) {
	
	var conn = db.getConnection();

	var profile = data.profile;
	// console.log("save_profile:"+ JSON.stringify(profile));

	profile.profile_id = parseInt(profile.profile_id);

	var props = conn.escape(JSON.stringify(profile.properties));
	var sql;

	if ( profile.profile_id == 0) {
		// new profile
		sql = "INSERT INTO profiles (properties) VALUES ({{ props }});";
		sql = _.template(sql, {props:props, id:profile.profile_id});
	}
	else {
		// existing profile
		sql = "UPDATE profiles SET properties={{ props }} WHERE profile_id={{ id }};";
		sql = _.template(sql, {props:props, id:profile.profile_id});
	}

	// console.log(sql);
	var self = this;
	conn.query(sql, function (error, result) {
		if (error != null)
			console.log("ERROR",error);
		else {
			// 
			// no error - save the controls
			// 
			data.profile.result = result;
			if ( data.profile.profile_id == 0) {
				data.profile.profile_id = result.insertId;
			}
			self.save_controls(socket, data);
		}
	});

	return true;
}


module.exports.save_controls = function(socket, data) {

	var conn = db.getConnection();

	var profile = data.profile;
	var controls = data.controls;			

	_.each(controls, function(c){
		//console.log("save control:"+ JSON.stringify(c));

		var props = conn.escape(JSON.stringify(c.properties));
		
		c.control_id = parseInt(c.control_id);
		if (c.control_id == 0) {
			sql = "INSERT INTO controls (profile_id,properties,field_order) VALUES ({{ pid }},{{ props }},{{ order }});";
			sql = _.template(sql, {pid:profile.profile_id, props:props, order:parseInt(c.field_order)});
		}
		else {
			sql = "UPDATE controls SET properties={{ props }}, field_order={{ order }} WHERE control_id={{ id }};";
			sql = _.template(sql, {props:props, order:parseInt(c.field_order), id:parseInt(c.control_id)});
		}

		conn.query(sql, function (error, result) {
			if (error != null)
				console.log("ERROR",error);
			else {
				// no error				
			}
		});

	});


	_.each(data.deletes, function(delete_id){
		//console.log("save control:"+ JSON.stringify(c));

		sql = "DELETE FROM controls WHERE control_id="+parseInt(delete_id)+" LIMIT 1;";
		console.log(sql);
		conn.query(sql, function (error, result) {
			if (error != null)
				console.log("ERROR",error);
			else {
				// no error				
			}
		});

	});


	socket.emit('save_profile', {error:200, errorText:"OK", profile: data.profile});
	return true;
}

