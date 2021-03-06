## beerNode v1.0

**beerNode** is a 2'nd generation project to create a home brew controller using
free, open-source technologies.

My 1'st generation controller is based on Linux and 1-Wire devices and the
software is a collection of bash scripts I wrote. The scripts work, but there
is no UI. You can review it [here](http://www.homebrewtalk.com/f51/monitoring-controlling-linux-cheap-240955).

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

**beerNode** also offeres something not commonly found elsewhere: the display 
is 100% up to you. The user interface is not "hard coded" - it's driven by 
HTML "templates" that you can easily edit in order to create your own display/view. 
It can be as simple, or as complicated as you want. It can be a brew controller, 
or it can be used to control a bank of fermemters (no limit on how many). 
Lastly, **beerNode** utilizes responsive Bootstrap, so your mobile devices work too!

The software runs on Linux, any flavor. The development and testing is done
using Fedora, but is targeted to the Raspberry Pi hardware. 

### Overview
	- Raspberry Pi based.
	- Node.js server provides all server side functionality. No web server needed.
	- Backbone.js and Bootstrap 3 are used to create the browser app.
	- Fully templated UI.
	- Temperature control via basic, range or PID.
	- Advanced graphing with server backed history.
	- 1-Wire and GPIO support


### Requirements

	- Node.js 
	- 1-Wire filesystem
	

### Install
Raspberry Pi setup instructions: [click](https://github.com/chriscurran/beerNode/wiki/Setup-your-Raspberry-Pi). When the Pi is ready, install beerNode:

	- # git clone https://github.com/chriscurran/beerNode.git
	- # cd beerNode
	- # npm install

### Wiki
There's a [wiki](https://github.com/chriscurran/beerNode/wiki) too.



### Screenprints
#### Dashboard
![alt text](http://www.planetcurran.com/beer/beerNode/dashboard-00.png "Dashboard")

#### PID Options
![alt text](http://www.planetcurran.com/beer/beerNode/1820-options.png "PID Options")

#### Range Options
![alt text](http://www.planetcurran.com/beer/beerNode/1820-range.png "Range Options")


### Configuration

Please see the wiki.


### Bullpen

      - Replace Steelseries gauges with Highcharts radial charts. They're not quite as pretty as Steelseries,
		but it would cut the "fat" a tiny bit, and, Highcharts is well supported whereas Steelseries appears to be 
		mostly an abandoned project.

      - Integrate drag & drop "profile" builder. A profile is a sequence of tasks to perform.


#### Profile builder preview

 - A control is dragged from the left to the workspace. 
 - Controls can be reordered in thwe workspace by dragging them.

![Builder app](http://www.planetcurran.com/beer/beerNode/builder-main-00.png)


##### To edit the properties of a control, click it:

![Control options](http://www.planetcurran.com/beer/beerNode/builder-control-00.png)


### Technologies and packages used by beerNode

 - Node.js, http://nodejs.org
 - Bootstrap 3.x, http://getbootstrap.com
 - Redis, http://redis.io
 - Backbone.js, http://backbonejs.org
 - Highcharts, http://www.highcharts.com
 - INI Parser, https://github.com/shockie/node-iniparser
 - Class.js, http://ejohn.org/blog/simple-javascript-inheritance
 - Steelseries, https://github.com/HanSolo/SteelSeries-Canvas
