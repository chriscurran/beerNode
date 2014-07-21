## beerNode v1.0

**beerNode** is a 2'nd generation project to create a home brew controller using
free, open-source technologies.

My 1'st generation controller is based on Linux and 1-Wire devices and the
software is a collection of bash scripts I wrote. The scripts work, but there
is no UI. You can review it here: [click](http://www.homebrewtalk.com/f51/monitoring-controlling-linux-cheap-240955)

I've been happy with the 1Wire devices, but one thing that trips me up is that
the above controller, and most others that I know of, are "centralized". What
I wanted was a "decentralized" solution that would control the brew process,
but allow me to monitor and change settings on one device (e.g. my cell phone)
and have those changes automatically be reflected on any other device that was
also monitoring (e.g. laptop), without having to refresh anything. They call
this "push" technology in the web world.

There are any number of good solutions for push functionality, but I selected
Node.js due to it's socket stack and minimal cpu/memory requirements (as
compared to full blown web server like Apache or NGINX).

The software runs on Linux, any flavor. The development and testing is done
using Fedora, but is targeted to the Raspberry Pi hardware. The setup instructions 
for your Pi: [Raspberry Pi setup instructions](https://github.com/chriscurran/beerNode/wiki/Raspberry-Pi)


### Requirements

	- Node.js 
	- 1-Wire filesystem
	
How to setup the Raspberry Pi with Node.js and 1-Wire: [Wiki](https://github.com/chriscurran/beerNode/wiki/Raspberry-Pi).
	

### Install

	- # git clone https://github.com/chriscurran/beerNode.git
	- # cd beerNode
	- # npm install

### Screenprints
#### Dashboard
![alt text](http://www.planetcurran.com/beer/beerNode/dashboard.png "Dashboard")

#### PID Options
![alt text](http://www.planetcurran.com/beer/beerNode/1820-options.png "PID Options")

#### Range Options
![alt text](http://www.planetcurran.com/beer/beerNode/1820-range.png "Range Options")


### Uses

	- Node.js, http://nodejs.org/
	- Bootstrap 3.x, http://getbootstrap.com/
	- Backbone.js, http://backbonejs.org/
	- Highcharts, http://www.highcharts.com/
	- Node PID Controller, https://github.com/Philmod/node-pid-controller
	- INI Parser, https://github.com/shockie/node-iniparser
	- Class.js, http://ejohn.org/blog/simple-javascript-inheritance/
	- Steelseries, https://github.com/HanSolo/SteelSeries-Canvas
