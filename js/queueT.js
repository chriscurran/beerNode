/**
 * Queue class
 */
var queueT = function(size) {
	if (typeof size === 'undefined')
		size = 0;

	this.data = [];
	this.size = size;
};

/**
 *
 */
queueT.prototype.get_data = function() {
	return this.data;
};

/**
 *
 */
queueT.prototype.set_data = function(data) {
	this.data = data;
};

/**
 *
 */
queueT.prototype.lpush = function(val) {

	this.data.unshift(val);

	if (this.size>0 && this.data.length > this.size)
		this.data.pop();
};

/**
 *
 */
queueT.prototype.lpop = function() {

	return this.data.shift();		

};


/**
 *
 */
queueT.prototype.rpush = function(val) {

	this.data.push(val);		

	if (this.size>0 && this.data.length > this.size)
		this.data.shift();
};

/**
 *
 */
queueT.prototype.rpop = function() {

	return this.data.pop();	

};


/**
 *
 */
queueT.prototype.iterate = function(cb) {

	var l = this.data.length;
	for (i=0; i<l; i++) {
		if (cb(this.data[i],i) != true)
			break;
	}
};



/**
 *
 */
queueT.prototype.sum = function() {

	var val = 0;
	var l = this.data.length;
	for (i=0; i<l; i++) {
		val +=  this.data[i];
	}
	return val;
};

/**
 *
 */
queueT.prototype.avg = function() {

	return this.sum() / this.data.len;
};


/**
 *
 */
queueT.prototype.del_idx = function(idx) {

	delete this.data[idx];

};


module.exports = queueT;
