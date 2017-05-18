var __ = __ || {};

(function(__) {

	__.pagination = (function() {

		var defaultOptions = {
			start : 0,
			limit : 10
		};

		var PageUtil = {
			getPageNo : function(start, limit) {
				return ((start / limit) | 0) + 1;
			},
			getStart : function(pageNo, limit) {
				return (pageNo < 1 || limit < 1) ? -1 : (pageNo - 1) * limit;
			},
			getPageCount : function(total, limit) {
				return ((total < 0 || limit < 1) ? 0 : (((total - 1) / limit) | 0)) + 1;
			}
		};
		var Computed = {
			currentPage : function() {
				return PageUtil.getPageNo(this.start, this.limit);
			},
			totalPages : function() {
				return PageUtil.getPageCount(this.total, this.limit);
			},
			hasPrevious : function() {
				return this.currentPage != 1
			},
			hasNext : function() {
				return this.currentPage != this.totalPages
			},
			indexs : function() {
				var indexs = [], left = 1, right = this.totalPages;
				if (this.totalPages >= 11) {
					if (this.currentPage > 5 && this.currentPage < this.totalPages - 4) {
						left = this.currentPage - 5;
						right = this.currentPage + 4;
					} else {
						if (this.currentPage <= 5) {
							left = 1;
							right = 10;
						} else {
							right = this.totalPages;
							left = this.totalPages - 9;
						}
					}
				}
				while (left <= right) {
					indexs.push(left);
					left++;
				}
				return indexs;
			}
		};
		var Pagination = function(options) {

			this.id = $.uuid();

			this.options = $.extend({
				filters : {}
			}, options = options || {}, options.defaultOptions);

			this.vm = new Vue({
				el : options.el,
				methods : $.extend({}, options.methods || {}, {
					gotoPage : $.proxy(this.gotoPage, this)
				}),
				computed : Computed,
				data : {
					start : 0,
					limit : 10,
					total : 0,
					records : []
				},
				filters : {
					encodeHTML : function(value) {
						return $.encodeHTML(value);
					},
					formatDate : function(value, format) {
						return $.formatDate(value, format);
					}
				},
				components : {
					'pagination-page' : {
						template : [ //
						'<ul class="data-grid-page">',//
						'	<li v-if="hasPrevious"><a v-on:click.stop="gotoPage(currentPage-1)">上一页</a></li>',//
						'	<li v-for="index in indexs"><a v-on:click.stop="gotoPage(index)" v-bind:class="{\'active\':currentPage==index}">{{index}}</a></li>',//
						'	<li><span>第 {{currentPage}} 页，共 {{totalPages}} 页</span></li>',//
						'	<li v-if="hasNext"><a v-on:click.stop="gotoPage(currentPage+1)">下一页</a></li>',//
						'</ul>' ].join(''),
						props : [ 'start', 'limit', 'total' ],
						computed : Computed,
						methods : {
							gotoPage : function(page) {
								this.$parent.gotoPage(page);
							}
						},
					}
				}
			});
		}

		$.extend(Pagination.prototype, {
			load : function(filters, options) {
				$.mask(this.id + '-mask');

				var start = 0, limit = this.options.limit;

				this.options.filters = filters || {};
				options && ((start = options.start || 0) | (limit = options.limit || 10));

				var params = $.extend({}, this.options.filters, {
					':start' : start,
					':limit' : limit
				});
				var vm = this.vm;
				$.post(this.options.url, params, function(response) {
					$.unmask(this.id + '-mask');
					var page = $.decode(response);
					vm.start = page.start | 0;
					vm.limit = page.limit || 10;
					vm.records = page.records || [];
					vm.total = page.total | 0;
				}, 'text');
			},
			reload : function() {
				this.load(this.options.filters, {
					start : this.vm.start,
					limit : this.vm.limit
				});
			},
			gotoPage : function(page) {
				this.load(this.options.filters, {
					start : PageUtil.getStart(page, this.vm.limit),
					limit : this.vm.limit
				});
			}
		});

		return function(options) {
			return new Pagination(options);
		};
	})();

})(__);
