/**
 * jQuery +扩充 Library v1.0<br>
 * 提供了一些jQuery缺失的函数和变量.<br>
 * @author : YaoYiLang
 * @version 1.0 α.1
 */
(function($) {
	var vMaskHash = {}, LOADING_PANEL_ID = 'y-loading-panel';

	$.extend({
		isDate : function(v) {
			return Object.prototype.toString.call(v) === "[object Date]";
		},
		isRegExp : function(v) {
			return Object.prototype.toString.call(v) === "[object RegExp]";
		},
		isEmpty : function(v, allowBlank) {
			return v === null || v === undefined || (($.isArray(v) && !v.length)) || (!allowBlank ? v === '' : false);
		},
		defer : function(fn, millis) {
			millis = !isNaN(millis) && millis > 0 ? millis : 1;
			return setTimeout(fn, millis);
		},
		/**
		 * 将JS对象，序列化为JSON字符串
		 * @param value JS对象
		 * @return 对象的JSON字符串
		 */
		encode : (function() {
			var I = !!{}.hasOwnProperty, _ = function(I) {
				return I < 10 ? "0" + I : I;
			}, A = {
				"\b" : "\\b",
				"\t" : "\\t",
				"\n" : "\\n",
				"\f" : "\\f",
				"\r" : "\\r",
				"\"" : "\\\"",
				"\\" : "\\\\"
			}, stringify = (function(C) {
				if (typeof C == "undefined" || C === null) {
					return "null";
				} else {
					if (Object.prototype.toString.call(C) === "[object Array]") {
						var B = [ "[" ], G, E, D = C.length, F;
						for (E = 0; E < D; E += 1) {
							F = C[E];
							switch (typeof F) {
							case "undefined":
							case "function":
							case "unknown":
								break;
							default:
								if (G) {
									B.push(",");
								}
								B.push(F === null ? "null" : stringify(F));
								G = true;
							}
						}
						B.push("]");
						return B.join("");
					} else {
						if ((Object.prototype.toString.call(C) === "[object Date]")) {
							return "\"" + C.getFullYear() + "-" + _(C.getMonth() + 1) + "-" + _(C.getDate()) + "T" + _(C.getHours()) + ":"
									+ _(C.getMinutes()) + ":" + _(C.getSeconds()) + "\"";
						} else {
							if (typeof C == "string") {
								return "\"" + C.replace(/([\x00-\x1f\\"])/g, function(B, _) {
									var I = A[_];
									if (I) {
										return I;
									}
									return '';
								}).replace(/[^\u0000-\u00FF]/g, function($0) {
									return escape($0).replace(/(%u)(\w{4})/gi, "\\u$2")
								}) + "\"";
							} else {
								if (typeof C == "number") {
									return isFinite(C) ? String(C) : "null";
								} else {
									if (typeof C == "boolean") {
										return String(C);
									} else {
										B = [ "{" ], G, E, F;
										for (E in C) {
											if (!I || C.hasOwnProperty(E)) {
												F = C[E];
												if (F === null) {
													continue;
												}
												switch (typeof F) {
												case "undefined":
												case "function":
												case "unknown":
													break;
												default:
													if (G) {
														B.push(",");
													}
													B.push(stringify(E), ":", stringify(F));
													G = true;
												}
											}
										}
										B.push("}");
										return B.join("");
									}
								}
							}
						}
					}
				}
			});
			return stringify;
		})(),
		/**
		 * 将JSON字符串，反序列化为JS对象
		 * @param json JSON字符串
		 * @return JS对象
		 */
		decode : function(json, unsafe) {
			try {
				return $.parseJSON(json);
			} catch (e) {
				if (unsafe === true) {
					try {
						return eval('(' + json + ')');
					} catch (e) {
					}
				}
			}
			return undefined;
		},
		/** 转义正则字符 */
		encodeReg : function(value) {
			return String(value).replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
		},
		/** 转义HTML字符 */
		encodeHTML : function(content) {
			return $("<div/>").text(String(content)).html().replace(new RegExp('[\"\'<>&\s]', 'g'), function($0) {
				switch ($0) {
				case '&':
					return 'amp;';
				case '"':
					return '&quot;';
				case "'":
					return '&apos;';
				case '>':
					return '&gt;';
				case '<':
					return '&lt;';
				case ' ':
					return '&nbsp;';
				default:
					return $0;
				}
			});
		},
		parseDate : (function() {
			var methods = {
				'y' : function(d, v) {
					d.setFullYear(v);
				},
				'M' : function(d, v) {
					d.setMonth(v - 1);
				},
				'd' : function(d, v) {
					d.setDate(v);
				},
				'H' : function(d, v) {
					d.setHours(v);
				},
				'm' : function(d, v) {
					d.setMinutes(v);
				},
				's' : function(d, v) {
					d.setSeconds(v);
				}
			}, PATTERNS = [//
			[ 'yyyy-MM-dd HH:mm:ss', /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/ ],//
			[ 'yyyy-MM-dd', /\d{4}-\d{2}-\d{2}/ ] //
			];
			return function(input, pattern) {
				try {
					if (!pattern) {
						for (i = 0, l = PATTERNS.length; i < l; i++) {
							if (PATTERNS[i][1].exec(input)) {
								pattern = PATTERNS[i][0];
								break;
							}
						}
					}
					var matchs1 = (pattern || 'yyyy-MM-dd').match(/([yMdHsm])(\1*)/g);
					var matchs2 = input.match(/(\d)+/g);
					if (matchs1.length == matchs2.length) {
						var d = new Date(1970, 0, 1);
						for (var i = 0; i < matchs1.length; i++) {
							(methods[matchs1[i].charAt(0)] || $.noop)(d, parseInt(matchs2[i], 10));
						}
						return d;
					}
				} catch (err) {
				}
				return null;
			};
		})(),
		formatDate : function() {
			var SIGN_RG = /([yMdHsm])(\1*)/g;
			function padding(s, len) {
				var len = len - (s + '').length;
				for (var i = 0; i < len; i++) {
					s = '0' + s;
				}
				return s;
			}
			return function(value, pattern) {
				if (!$.isDate(value)) {
					return '';
				}
				try {
					pattern = pattern || 'yyyy-MM-dd HH:mm:ss';
					return pattern.replace(SIGN_RG, function($0) {
						switch ($0.charAt(0)) {
						case 'y':
							return padding(value.getFullYear(), $0.length);
						case 'M':
							return padding(value.getMonth() + 1, $0.length);
						case 'd':
							return padding(value.getDate(), $0.length);
						case 'w':
							return value.getDay() + 1;
						case 'H':
							return padding(value.getHours(), $0.length);
						case 'm':
							return padding(value.getMinutes(), $0.length);
						case 's':
							return padding(value.getSeconds(), $0.length);
						case 'q':
							return Math.floor((this.getMonth() + 3) / 3);
						default:
							return '';
						}
					});
				} catch (err) {
					return '';
				}
			};
		}(),
		encodeUrlParams : function(params) {
			var search = [];
			var addFields = function(key, val) {
				if (val == null) {
					return;
				}
				search.push([ encodeURIComponent((key + '').replace(/ /g, '+')), '=', encodeURIComponent((val + '').replace(/ /g, '+')) ].join(''));
			}
			$.each(params, function(key, val) {
				if (val == null) {
					return;
				}
				if ($.isArray(val)) {
					$.each(val, function() {
						addFields(key, this);
					});
				} else {
					addFields(key, val);
				}
			});
			return search.join('&');
		},
		decodeUrlParams : function(search) {
			search = search || location.search;
			var params = {};
			// (remove any leading ? || #)(remove any trailing & || ;)(replace
			// +'s with spaces)(split & || ;)
			jQuery.each(search.replace(/^[?#]/, '').replace(/[;&]$/, '').replace(/[+]/g, ' ').split(/[&;]/), function(i, o) {
				var key = decodeURIComponent(this.split('=')[0] || '');
				var val = decodeURIComponent(this.split('=')[1] || '');
				if (!key) {
					return;
				}
				if ($.isArray(params[key])) {
					params[key].push(val);
				} else if (params[key] != null) {
					params[key] = [ params[key], val ];
				} else {
					params[key] = val;
				}
			});
			return params;
		},
		uuid : function() {
			var d = $.now();
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = (d + Math.random() * 16) % 16 | 0;
				d = Math.floor(d / 16);
				return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
			});
		},
		/**
		 * 错误检验.<br>
		 * 如果AJAX出现异常,那么会返回异常对象,否则返回false.
		 * @param o 后台返回的对象
		 * @return 如果对象为一个异常则返回true，否则返回false.
		 */
		err : function(o) {
			if (o && o['@failure'] === true) {
				return o;
			}
			return false;
		},
		/** 添加页面蒙版 */
		mask : function(key) {
			vMaskHash[key + ''] = true;
			if ($('#' + LOADING_PANEL_ID).length == 0) {
				$('<div id="' + LOADING_PANEL_ID + '_mask" class="x-loading-mask" style="font-size: 30px"></div>'//
						+ '<div id="' + LOADING_PANEL_ID + '"class="x-loading-panel">'//
						+ '	<div class="x-loading-indicator">'//
						+ '		Loading...'//
						+ '	</div>'//
						+ '</div>').appendTo($(document.body));
			}
			if ($('#' + LOADING_PANEL_ID + '_mask').show().length > 0) {
				$('#' + LOADING_PANEL_ID).show();
			}
		},
		/** 取消页面蒙版 */
		unmask : function(key) {
			delete vMaskHash[key + ''];
			if ($('#' + LOADING_PANEL_ID + '_mask').hide().length > 0) {
				$('#' + LOADING_PANEL_ID).hide();
			}
		},
		/**
		 * 获得最顶层窗口(有访问权限的)
		 * @return 有访问权限的最顶层窗口
		 */
		top : function(selector, shift) {
			var win = window, stack = [], pop = shift === true ? 'shift' : 'pop';
			while (win != win.parent) {
				stack.push(win = win.parent);
			}
			for (; stack.length;) {
				win = stack[pop]();
				try {
					var pd = win.document; // 在没权限访问parent中的对象时会出错
					var all = pd.getElementsByTagName('*');
					if (typeof win.$ !== 'undefined' && typeof win.$.top !== 'undefined' && (!$.isFunction(selector) || selector(win) === true)) {
						return win;
					}
				} catch (ex) {
				}
			}
			return window;
		},
		download : (function() {
			return function(url, params) {
				var oForm = document.createElement('form'), html = '';
				oForm.style.display = 'none';
				oForm.method = 'post';
				oForm.action = url;
				document.body.appendChild(oForm);
				if (params) {
					for ( var n in params) {
						var v = params[n];
						if (!!v) {
							if ($.isPlainObject(v)) {
								v = $.encode(v);
							} else if ($.isArray(v)) {
								v = $.encode(v);
							}
						}
						html += '<input name="' + $.encodeHTML(n) + '" value="' + $.encodeHTML(v) + '" type="hidden" />\n'
					}
				}
				oForm.innerHTML = html;
				oForm.submit();
				setTimeout(function() {
					document.body.removeChild(oForm);
					oForm = null;
				}, 10 * 1000);
			};
		})()
	});

	$.extend({
		open : function() {
			cfg = cfg || {};
			var url = cfg.url || 'about:blank';
			var name = cfg.name || '';
			var width = cfg.width || 800;
			var height = cfg.height || 600;
			var scrollbars = cfg.scrollbars || false;
			var screenWidth = window.screen.width;
			var screenHeight = window.screen.height;
			if (width > screenWidth - 50) {
				width = screenWidth - 50;
			}
			if (height > screenHeight - 75) {
				height = screenHeight - 75;
			}
			var x = parseInt((screenWidth - width) / 2);
			var y = parseInt((screenHeight - height) / 2) - 50;
			if (y <= 0) {
				y = 50;
			}
			$.mask(url + '-dlg');
			var dlg = window.open(url, name, 'top=' + y + ',left=' + x + ',width=' + width + ',height=' + height + ',resizable=yes,scrollbars='
					+ scrollbars);
			var interval = null;
			var main = $(window);
			var destroyFn = function() {
				if (interval) {
					clearInterval(interval);
				}
				if (dlg && (!dlg.closed)) {
					dlg.close();
				}
				main.unbind('unload', destroyFn);
				destroyFn = dlg = main = null;
				$.unmask(url + '-dlg');
			}
			main.bind('unload', destroyFn);
			$.defer(function() {
				interval = setInterval(function() {
					if ((!dlg) || (dlg.closed)) {
						destroyFn();
					}
				}, 500)
			}, 500);
			try {
				dlg.focus();
			} catch (e) {
			}
			return dlg;
		}
	});

	$.extend((function() {
		var ajax = function(type, url, data, callback, sync) {
			if ($.isFunction(data)) {
				callback = data;
				data = {};
			}
			var isJsonp = type === 'jsonp';
			if (isJsonp) {
				type = 'get';
			}
			var request = $.ajax({
				url : url,
				type : type,
				async : !(sync && (sync === 'sync')),
				data : type == 'post' ? JSON.stringify(data) : data,
				contentType : "application/json",
				timeout : 60 * 1000,
				dataType : 'text',
				/* 'xhrFields': {'withCredentials': true},'crossDomain': true, */
				success : function(response, status, xhr) {
					var headers = {};
					try {
						var value = xhr.getResponseHeader('@REDIRECT');
					} catch (e) {
					}
					if ($.isFunction(callback)) {
						callback($.decode(response));
					}
				},
				error : function(result) {
				}
			});
			return request;
		};
		return ({
			postJSON : function(url, data, callback) {
				return ajax('post', url, data, callback);
			},
		});

	})());

	$.fn.extend((function() {
		var rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i, //
		rsubmittable = /^(?:input|select|textarea|keygen)/i, //
		rcheckableType = (/^(?:checkbox|radio)$/i), //
		rform = /form/i, //
		mapField = function(el) {
			return el.map(function() {
				var elements = $.prop(this, "elements");
				return elements ? $.makeArray(elements) : this;
			});
		};
		return ({
			vals : function(values, flag) {
				if (values == undefined) {
					values = {};
					mapField(this).filter(
							function() {
								var type = this.type;
								return this.name && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type)
										&& (this.checked || !rcheckableType.test(type));
							}).map(function(i, elem) {
						values[elem.name] = $(this).val();
					});
					return values;
				} else {
					this.reset();
					mapField(this).filter(function() {
						var type = this.type;
						return this.name && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type);
					}).map(function(i, elem) {
						var type = this.type, val = values[this.name];
						if (rcheckableType.test(type)) {
							this.value == String(val) && $(this).prop('checked', true);
						} else if (val != null) {
							$(this).val(val);
						}
					});
					typeof layui !== 'undefined' && (function() {
						layui.form().render()
					})();
					return this;
				}
			},
			reset : function() {
				this.filter(function() {
					return $.isFunction(this.reset);
				}).each(function() {
					this.reset();
				});
			},
			markInvalid : function(errors, force) {
				this.each(function(i, el) {
					var el = $(this), nodeName = (this.nodeName || '').toLowerCase(), name, anchor;
					if (rform.test(nodeName)) {
						for (name in errors) {
							anchor = el.find('[invalid-tips-anchor="' + name + '"]');
							anchor.length ? anchor.markInvalid(errors[name], true) : el.find('[name="' + name + '"]').markInvalid(errors[name]);
						}
					} else if (force === true || rsubmittable.test(nodeName)) {
						layer.tips(errors, this, {
							tips : [ 2, '#FFBA32' ],
							tipsMore : true
						});
					}
				});
				return this;
			}
		});
	})());

	$.extend({
		cookie : (function() {
			var cookie = {
				set : function(name, value, option) {
					// (document.location.protocol);
					// (document.location.host);
					// (document.location.pathname);
					option = option || {};
					if (value == null) {
						option.expireDays = -1;
					}
					var str = name + '=' + escape(value);
					if (option.expireDays) {
						var date = new Date();
						var ms = option.expireDays * 24 * 3600 * 1000;
						date.setTime(date.getTime() + ms);
						str += '; expires=' + date.toGMTString();
					} else if (option.expireMillisecond) {
						var date = new Date();
						var ms = option.expireMillisecond;
						date.setTime(date.getTime() + ms);
						str += '; expires=' + date.toGMTString();
					}
					if (option.path) {
						str += '; path=' + path;
					}
					if (option.domain) {
						str += '; domain' + domain;
					}
					if (option.secure) {
						str += '; true';
					}
					document.cookie = str;
				},
				get : function(name) {
					var cookieArray = document.cookie.split("; ");
					for (var i = 0; i < cookieArray.length; i++) {
						var arr = cookieArray[i].split("=");
						if (arr[0] == name) {
							return unescape(arr[1]);
						}
					}
					return null;
				},
				remove : function(name) {
					cookie.set(name, null);
				}
			};
			return cookie;
		})(),
		layer : (function() {
			var T = '&', initialize = function() {
				typeof (layui) !== 'undefined' && ((layui.layer[T] = {
					uuid : $.uuid(),
					fulls : {},
					results : {}
				}) | $(window).resize(function() {
					$.each(layer[T].fulls, function(index) {
						layer.full(index);
					});
				}) | (initialize = null));
			};
			typeof layui === 'undefined' ? $(initialize) : initialize();
			return {
				open : function(options) {
					var layer = layui.layer, results = layer[T].results, fulls = layer[T].fulls, config = $.extend({
						type : 2,
						content : '#'
					}, options, {
						end : function() {
							try {
								$.isFunction(options.end) && options.end($.decode(results[index]));
							} finally {
								delete fulls[index]
								delete results[index];
							}
						}
					}), index = layer.open(config);
					config.type == 2 && (function(layero) {
						layero.find('iframe').on('load', function() {
							layero.find('iframe')[0].contentWindow.layer[T].openerUuid = layer[T].uuid;
						});
					})($('#layui-layer' + index));

					if (options.isFull === true) {
						fulls[index] = true;
						layer.full(index);
					}
				},
				close : function(index, result) {
					if (index === '_self') {
						var opener = $.top((function(uuid) {
							return function(win) {
								return win.layer && win.$.layer && win.layer[T].uuid === uuid;
							};
						})(layer[T].openerUuid));
						index = opener.layer.getFrameIndex(window.name)
						opener.$.layer.close(index, result);
						return;
					}
					layer[T].results[index] = $.encode(result);
					layer.close(index);
				},
				msg : function(content, options, end) {
					layer.msg(content, options, end);
				},
				alert : function(content, options, yes) {
					layer.alert(content, options, yes);
				},
				confirm : function(content, options, yes, cancel) {
					layer.confirm(content, options, yes, cancel);
				}
			};
		})()
	});

	$.ajax = (function() {
		var originalAjax = $.ajax;
		return function(url, options) {
			if (typeof url === "object") {
				options = url;
				url = undefined;
			}
			$.isFunction(options.success)
					&& (options.success = (function() {
						var originalSuccess = options.success;
						return function(response, status, xhr) {
							try {
								/* REDIRECT_INTERCEPTOR */(xhr.getResponseHeader('_SESSION_TIMEOUT') === 'Y')
										&& (typeof layui === 'undefined' ? (function() {
											alert('当前会话已经失效，请重新登录');
											window.top.location.href = (_ctx || '') + '/_/logout.html';
										})() : layui.layer.alert('当前会话已经失效，请重新登录', function(index) {
											layui.layer.close(index);
											window.top.location.href = (_ctx || '') + '/_/logout.html';
										}));
							} catch (e) {
							}
							originalSuccess.apply(this, [ response, status, xhr ]);
						};
					})())
			return originalAjax.call(url, options);
		}
	})();

	$.ajaxSetup({
		traditional : true
	});

})(jQuery);
