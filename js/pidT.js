/**
 *  PID Controller.

Proportional 
Run the fan proportional to temperature error. That is, for every
degree the current temperature is from the set point run the fan at P%. For
example, for P=5 if our setpoint temperature is 200F and we're currently at
190F, run the fan at (200 - 190) x 5% = 50%. A proportional-only algorithm
oscillates up and down with a amplitude relative to the size of P.

Integral 
Increase or decrease the fan speed based on accumulated temperature
error. That is, for every degree of error per second add I% to the fan speed.
For example, for I=0.1, setpoint=200F, and current=190F after one second add
(200 - 190) x 0.1% = 1%. Assuming the current temperature stays the same, the
integral term will increase 1% every second. The integral term is responsible
for shifting the oscillation created by the proportional term unti it
oscillates on each side of the setpoint.

Derivative
Increase or decrease the fan speed based on change in temperature.
That is, for every degree the temperature has changed over the last T seconds,
add D% to the fan speed. For example, for D=10, setpoint=200F and the
temperature has decreased from 210F to 205F over the past T seconds, add (210
- 205) x 10% = 50%. The D term is the value that is trying to look ahead to
see what is going to happen to the temperature over time. This value prevents
overshoot when starting the grill, as well as starts stoking the fire before
the temperature has gone below the setpoint.

 */
var pidT = function(k_p, k_i, k_d) {
	this.k_p = k_p || 1;
	this.k_i = k_i || 0;
	this.k_d = k_d || 0;

	this.sumError  = 0;
	this.lastError = 0;
	this.lastTime  = 0;

	this.target    = 0; // default value, can be modified with .setTarget
};

pidT.prototype.setTarget = function(target) {
	this.target = target;
};

pidT.prototype.getHighResPID = function() {
	return this.pid;
};


pidT.prototype.update = function(current_value) {
	this.current_value = current_value;

	var error = (this.target - this.current_value);
	this.sumError = this.sumError + error;
	var change = error - this.lastError;
	this.lastError = error;

	var pid = (this.k_p*error) + (this.k_i * this.sumError) + (this.k_d * change);
	this.pid = pid.toFixed(4);

	if (pid < 0.0) {
		// less than 0% makes no sense
		pid = 0.0;
		this.sumError = 0;		// lets not accum the error if we're not on
	}
	else if (pid > 1.0) {  	
		// limit to 100% pid value
		pid = 1.0;
		this.sumError = 0;		// lets not accum the error if we're already at 100%
	}

	return pid;
};

module.exports = pidT;
