var PORT = 6001;

// 引入net模块
var net = require('net');
var crypto = require('crypto');

var parseHeader = function(string) {
	var headers = {};

	// 将请求头数据按回车符切割为数组，得到每一行数据
	var array = string.split('\r\n');
	// 第一行数据为 GET / HTTP/1.1
	array.shift();

	array.forEach(function(item) {
		var nv = item.split(':'), name = nv[0] || '', value = nv[1] || '';
		console.log(nv)
		// 去除无用的空格，将属性名转为小写
		name = name.replace(/^\s|\s+$/g, '').toLowerCase();
		value = value.replace(/^\s|\s+$/g, '');
		// 获取所有的请求头属性
		headers[name] = value;
	});
	return headers;
};
var encodeWsFrame = function(data) {
	const isFinal = data.isFinal !== undefined ? data.isFinal : true, opcode = data.opcode !== undefined ? data.opcode : 1, payloadData = data.payloadData ? Buffer
			.from(data.payloadData)
			: null, payloadLen = payloadData ? payloadData.length : 0;
	let frame = [];
	if (isFinal)
		frame.push((1 << 7) + opcode);
	else
		frame.push(opcode);
	if (payloadLen < 126) {
		frame.push(payloadLen);
	} else if (payloadLen < 65536) {
		frame.push(126, payloadLen >> 8, payloadLen & 0xFF);
	} else {
		frame.push(127);
		for (let i = 7; i >= 0; --i) {
			frame.push((payloadLen & (0xFF << (i * 8))) >> (i * 8));
		}
	}
	frame = payloadData ? Buffer.concat([ Buffer.from(frame), payloadData ]) : Buffer.from(frame);
	console.dir(decodeWsFrame(frame));
	return frame;
};
var decodeWsFrame = function(data) {
	var start = 0;
	var frame = {
		isFinal : (data[start] & 0x80) === 0x80,
		opcode : data[start++] & 0xF,
		masked : (data[start] & 0x80) === 0x80,
		payloadLen : data[start++] & 0x7F,
		maskingKey : '',
		payloadData : null
	};

	if (frame.payloadLen === 126) {
		frame.payloadLen = (data[start++] << 8) + data[start++];
	} else if (frame.payloadLen === 127) {
		frame.payloadLen = 0;
		for (var i = 7; i >= 0; --i) {
			frame.payloadLen += (data[start++] << (i * 8));
		}
	}
	if (frame.payloadLen) {
		if (frame.masked) {
			var maskingKey = [ data[start++], data[start++], data[start++], data[start++] ];
			frame.maskingKey = maskingKey;
			frame.payloadData = data.slice(start, start + frame.payloadLen).map(function(vByte, idx) {
				return (vByte ^ maskingKey[idx % 4]);
			});
		} else {
			frame.payloadData = data.slice(start, start + frame.payloadLen);
		}
	}
	console.dir(frame)
	return frame;
};

// 使用net模块创建服务器，返回的是一个原始的socket对象
var server = net.createServer(function(socket) {
	socket.once('data', function(buffer) {
		// 接收到HTTP请求头数据
		let data = buffer.toString()
		console.log(data)

		// 将请求头数据转为对象
		let headers = parseHeader(data)
		console.log(headers)

		// 判断请求是否为WebSocket连接
		if (headers['upgrade'] !== 'websocket') {
			// 若当前请求不是WebSocket连接，则关闭连接
			console.log('非WebSocket连接')
			socket.end();
		}
		// 判断WebSocket版本是否为13，防止是其他版本，造成兼容错误
		else if (headers['sec-websocket-version'] !== '13') {
			console.log('WebSocket版本错误')
			socket.end()
		}
		// 请求为WebSocket连接时，进一步处理
		else {
			// 校验用GUID
			// https://tools.ietf.org/html/rfc6455 |RFC6455
			var GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
			var key = headers['sec-websocket-key'];
			// 创建一个签名算法为sha1的哈希对象
			var hash = crypto.createHash('sha1');

			// 将key和GUID连接后，更新到hash
			hash.update(key + GUID);

			// 生成base64字符串
			var result = hash.digest('base64');

			// 生成供前端校验用的请求头，HTTP状态码101表示切换协议
			var header = [ //
			'HTTP/1.1 101 Switching Protocols\r\n',//
			'Upgrade: websocket\r\n',//
			'Connection: Upgrade\r\n',//
			'Sec-Websocket-Accept: ', result, '\r\n',//
			'\r\n' ].join('');

			// 返回HTTP头
			socket.write(header);

			// 7. 建立连接后，通过data事件接收客户端的数据并处理
			socket.on('data', function(buffer) {
				var data = decodeWsFrame(buffer);
				console.log(data);
				console.log(data.payloadData && data.payloadData.toString());
				// opcode为8，表示客户端发起了断开连接
				if (data.opcode === 8) {
					socket.end();// 与客户端断开连接
				} else {
					// 接收到客户端数据时的处理，此处默认为返回接收到的数据
					socket.write(encodeWsFrame({
						payloadData : '服务端接收到的消息为：' + (data.payloadData ? data.payloadData.toString() : '')
					}));
				}
			});
		}

	});
});

server.listen(PORT);

console.log('Server runing at port: ' + PORT + '.');