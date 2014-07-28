/**
 * Queue class
 */
var queueT = function(size) {
	this.data = [];
	this.size = size;
};

/**
 *
 */
queueT.prototype.lpush = function(val) {

	this.data.unshift(val);

	if (this.data.length > this.size)
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

	if (this.data.length > this.size)
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

	var val = this.sum();

	return val / this.data.len;
};


module.exports = queueT;
