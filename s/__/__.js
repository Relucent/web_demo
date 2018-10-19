var __ = {
	cxt : (function() {
		var scripts = document.getElementsByTagName('script'), src = scripts[scripts.length - 1].src;
		return src.substring(0, src.length - '/s/assets/__.js'.length);
	})(),
	url : function(path, params) {
		return ((/^https?:/ig).test(path) ? path : __.cxt + path) + (__.isEmpty(params) ? '' : '?' + __.encodeUrlParams(params));
	},
	api : (function() {
		var wrapCb = function(callback) {
			return !callback ? __.noop : function(response) {
				// console.log(response)
				callback(response.data);
			}
		}, catchFn = function(error) {
			console.log(error);
		};
		return function(method, url, data, callback) {
			method = method.toLowerCase();
			var config = {
				headers : {
					'X-Requested-with' : 'XMLHttpRequest'
				},
				method : method,
				url : __.url(url)
			};
			if ('post' === method || 'put' === method || 'patch' === method) {
				config.data = data;
			}
			// delete', 'get', 'head', 'options
			else {
				config.params = data;
			}
			return axios.request(config).then(wrapCb(callback))['catch'](catchFn);
		}
	})(),
	err : function(result) {
		return result && result.success === false;
	},
	navigateTo : function(url) {
		location.href = url;
	},
	noop : function() {
	},
	each : function(obj, callback) {
		var i, length = obj.length;
		if (__.isArraylike(obj)) {
			for (i = 0; i < length; i++) {
				if (callback.call(obj[i], i, obj[i]) === false) {
					break;
				}
			}
		} else {
			for (i in obj) {
				if (callback.call(obj[i], i, obj[i]) === false) {
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
	},
	encodeUrlParams : function(params) {
		var search = [];
		var addFields = function(k, v) {
			if (v == null) {
				return;
			}
			search.push([ encodeURIComponent(k), '=', encodeURIComponent(v) ].join(''));
		}
		__.each(params, function(k, v) {
			if (v == null) {
				return;
			}
			if (__.isArray(v)) {
				__.each(v, function() {
					addFields(k, this);
				});
			} else {
				addFields(k, v);
			}
		});
		return search.join('&');
	},
	decodeUrlParams : function(search) {
		search = search || location.search;
		var params = {};
		// (remove any leading ? || #)(remove any trailing & || ;)(replace +'s with spaces)(split & || ;)
		__.each(search.replace(/^[?#]/, '').replace(/[;&]$/, '').replace(/[+]/g, ' ').split(/[&;]/), function(i, t) {
			var kv = t.split('='), k = decodeURIComponent(kv[0] || ''), v = decodeURIComponent(kv[1] || '');
			if (!k) {
				return;
			}
			if (__.isArray(params[k])) {
				params[k].push(v);
			} else if (params[k] != null) {
				params[k] = [ params[k], v ];
			} else {
				params[k] = v;
			}
		});
		return params;
	}
};