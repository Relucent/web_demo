var PORT = 2000, HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Camera</title></head><body><video id="video" autoplay></video><script type="text/javascript">var getUserMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia;getUserMedia.call(navigator,{video:!0,audio:!0},function(e){var o=document.getElementById("video");o.src=window.URL.createObjectURL(e),o.onloadedmetadata=function(){console.log("Label: "+e.label),console.log("AudioTracks",e.getAudioTracks()),console.log("VideoTracks",e.getVideoTracks())}},function(e){console.log("Reeeejected!",e)});</script></body></html>';
require('http').createServer(function(request, response) {
	response.writeHead(200, {
		'Content-Type' : 'text/html'
	});
	response.write(HTML);
	response.end();
}).listen(PORT);
console.log('Server runing at port: ' + PORT + '.');