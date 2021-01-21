const PORT = 8080;

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const contentTypes = {
	'css' : 'text/css',
	'gif' : 'image/gif',
	'html' : 'text/html',
	'ico' : 'image/x-icon',
	'jpeg' : 'image/jpeg',
	'jpg' : 'image/jpeg',
	'js' : 'text/javascript',
	'json' : 'application/json',
	'pdf' : 'application/pdf',
	'png' : 'image/png',
	'svg' : 'image/svg+xml',
	'swf' : 'application/x-shockwave-flash',
	'tiff' : 'image/tiff',
	'ttf' : 'application/octet-stream',
	'txt' : 'text/plain',
	'wav' : 'audio/x-wav',
	'wma' : 'audio/x-ms-wma',
	'wmv' : 'video/x-ms-wmv',
	'xml' : 'text/xml'
};

const webroot = path.resolve(__dirname, './assets');

const server = http.createServer(function(request, response) {
	let pathname = url.parse(request.url).pathname;

	if (pathname.charAt(pathname.length - 1) === '/') {
		pathname += 'index.html';
	}

	let realPath = path.join(webroot, pathname);
	let ext = path.extname(realPath);
	ext = ext ? ext.slice(1) : 'unknown';
	fs.exists(realPath, function(exists) {
		if (!exists) {
			response.writeHead(404, {
				'Content-Type' : 'text/plain'
			});
			response.write("This request URL " + pathname + " was not found on this server.");
			response.end();
		} else {
			fs.readFile(realPath, "binary", function(err, file) {
				if (err) {
					response.writeHead(500, {
						'Content-Type' : 'text/plain'
					});
					response.end(err);
				} else {
					let contentType = contentTypes[ext] || "text/plain";
					response.writeHead(200, {
						'Content-Type' : contentType
					});
					response.write(file, "binary");
					response.end();
				}
			});
		}
	});
});
server.listen(PORT);
console.log('Server runing at port: ' + PORT + '.');