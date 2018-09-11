var __ = {
	cxt : (function() {
		var scripts = document.getElementsByTagName('script'), src = scripts[scripts.length - 1].src;
		return src.substring(0, src.length - '/s/assets/__.js'.length);
	})(),
	api : (function() {
		var wrapCb = function(callback) {
			return !callback ? __.noop : function(response) {
				// console.log(response)
				callback(response.data);
			}
		}, catchFn = function(error) {
			console.log(error);
		}
		return function(method, url, data, callback) {
			return axios.request({
				headers : {
					'X-Requested-with' : 'XMLHttpRequest'
				},
				method : method.toLowerCase(),
				url : __.ctx + url,
				data : data
			}).then(wrapCb(callback))['catch'](catchFn);
		}
	})(),
	navigateTo : function(url) {
		location.href = url;
	},
	noop : function() {
	},
	each : function(o, callback) {
		var i, length = o.length;
		if (__.isArraylike(o)) {
			for (i = 0; i < length; i++) {
				if (callback.call(array[i], i, o[i]) === false) {
					break;
				}
			}
		} else {
			for (i in o) {
				if (callback.apply(o[i], args) === false) {
					break;
				}
			}
		}
	},
	type : (function() {
		var class2type = {
			'[object Array]' : 'array',
			'[object Boolean]' : 'boolean',
			'[object Date]' : 'date',
			'[object Error]' : 'error',
			'[object Function]' : 'function',
			'[object Number]' : 'number',
			'[object Object]' : 'object',
			'[object RegExp]' : 'regexp',
			'[object String]' : 'string'
		}, toString = class2type.toString;
		return function(o) {
			return o == null ? (o + '') //
			: (typeof o === "object" || typeof o === "function" //
			? class2type[toString.call(o)] || "object" : typeof o);
		}
	})(),
	isArray : Array.isArray || function(o) {
		return __.type(o) === "array";
	},
	isDate : function(o) {
		return __.type(o) === "date";
	},
	isRegExp : function(o) {
		return __.type(o) === "regexp";
	},
	isFunction : function(o) {
		return __.type(o) === "function";
	},
	isArray : Array.isArray || function(o) {
		return __.type(o) === "array";
	},
	isWindow : function(o) {
		return o != null && o == o.window;
	},
	isEmpty : function(o, allowBlank) {
		return o === null || o === undefined || ((__.isArray(o) && !o.length)) || (!allowBlank ? o === '' : false);
	},
	isArraylike : function(o) {
		var length = o.length, type = __.type(o);
		if (type === "function" || __.isWindow(o)) {
			return false;
		}
		if (o.nodeType === 1 && length) {
			return true;
		}
		return type === "array" || length === 0 || typeof length === "number" && length > 0 && (length - 1) in o;
	},
	trim : function(text) {
		return text == null ? '' : (text + '').replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	}
};