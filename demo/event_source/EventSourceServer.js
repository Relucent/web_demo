var PORT = 9999;
var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');

var server = http.createServer(function(request, response) {

	var pathname = url.parse(request.url).pathname;

	if (pathname == '/stream') {

		response.writeHead(200, {
			'Content-Type' : 'text/event-stream',
			'Cache-Control' : 'no-cache',
			'Connection' : 'keep-alive'
		});

		var interval = setInterval(function() {
			response.write('data: ' + (new Date().getTime()) + '\n\n');
		}, 1000);

		request.connection.addListener("close", function() {
			clearInterval(interval);
		}, false);

	} else {
		var realPath = path.join('./EventSource.html');
		fs.readFile(realPath, "binary", function(err, file) {
			response.writeHead(200, {
				'Content-Type' : 'text/html'
			});
			response.write(file, "binary");
			response.end();
		});
	}
});
server.listen(PORT);

console.log('Your application is running here: http://localhost:' + PORT + '');

// node EventSourceServer.js
