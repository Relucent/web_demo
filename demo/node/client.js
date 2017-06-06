var http = require('http');

var options = {
	scheme : 'http',
	host : '127.0.0.1',
	port : '2000',
	path : '/index.html'
};

var callback = function(response) {
	var body = '';
	response.on('data', function(data) {
		body += data;
	});
	response.on('end', function() {
		console.log(body);
	});
}

var req = http.request(options, callback);
req.end();
