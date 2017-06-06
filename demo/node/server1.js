var PORT = 8080;
var http = require('http');
var server = http.createServer(function (request, response) {
	response.writeHead(200, {
		'Content-Type': 'text/plain'
	});
	response.write('hello world');
	response.end();
});
server.listen(PORT);
console.log('Server runing at port: ' + PORT + '.');