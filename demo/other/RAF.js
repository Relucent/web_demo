var RAF = (function(w) {
	return w.requestAnimationFrame || //
	w.webkitRequestAnimationFrame || //
	w.msRequestAnimationFrame || //
	w.mozRequestAnimationFrame || //
	w.oRequestAnimationFrame || //
	function(callback) {
		return w.setTimeout(function() {
			callback();
		}, 16.7);
	};
})(self);