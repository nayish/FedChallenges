self.addEventListener('message', function(e) {
	var r, error, value;
	
	var data = e.data;
	
	
	// Override the javascript console so we can save all logs
	console = {
		values: [],
		log: function () {
			this.values.push({type: "log", data: Array.prototype.slice.call(arguments)});
		},
		error: function () {
			this.values.push({type: "error", data: Array.prototype.slice.call(arguments)});
		},
		info: function () {
			this.values.push({type: "info", data: Array.prototype.slice.call(arguments)});
		}
	}
	
	try {
		eval(data.str);
		value = eval(data.fn).apply(this,data.param);
	} catch (e) {
		error = e.toString();
	}
	
	var result = {
		result: JSON.stringify(value),
		success: value===data.expectedResult,
		error: error,
		console: JSON.stringify(console)
	}
	
	self.postMessage(result);
}, false);