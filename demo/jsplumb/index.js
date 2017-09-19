//#端点样式设置
//##基本连接线样式
var connectorPaintStyle = {
	stroke : "#3cf",
	strokeWidth : 2,
	outlineColor : "blue",
	outlineWidth : 2
};
//##鼠标悬浮在连接线上的样式
var connectorHoverStyle = {
	stroke : "#f08aa5",
	strokeWidth : 2,
	outlineColor : "blue",
	outlineWidth : 2
};
var hollowCircle = {
	endpoint : [ "Dot", {
		cssClass : "endpointcssClass"
	} ], //端点形状
	connectorStyle : connectorPaintStyle,
	connectorHoverStyle : connectorHoverStyle,
	paintStyle : {
		fill : "#3cf",
		radius : 4,
	}, //端点的颜色样式
	isSource : true, //是否可拖动（作为连接线起点）
	connector : [ "Flowchart", {
		stub : 30,
		gap : 0,
		cornerRadius : 2,
		alwaysRespectStubs : true,
		midpoint : 0.5
	} ],
	isTarget : true, //是否可以放置（连接终点）
	maxConnections : -1
};
//#初始化一个jsPlumb实例
var instance = jsPlumb.getInstance({
	DragOptions : {
		cursor : "pointer",
		zIndex : 1000
	},
	ConnectionOverlays : [ [ "Arrow", {
		location : 1,
		visible : true,
		width : 11,
		length : 11,
		direction : 1,
		id : "arrow_forwards"
	} ], ],
	Container : "container"
});
instance.importDefaults({
	ConnectionsDetachable : true,
	ReattachConnections : true
});

//#UUID函数
var uuid = function() {
	var d = $.now();
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
};

var registerD = function(id) {
	$('#' + id).draggable({
		containment : "parent",
		drag : function(event, ui) {
			instance.repaintEverything();
		},
		stop : function() {
			instance.repaintEverything();
		}
	});
	//添加连接点
	instance.addEndpoint(id, {
		anchors : "RightMiddle"
	}, hollowCircle);
	instance.addEndpoint(id, {
		anchors : "LeftMiddle"
	}, hollowCircle);
	instance.addEndpoint(id, {
		anchors : "TopCenter"
	}, hollowCircle);
	instance.addEndpoint(id, {
		anchors : "BottomCenter"
	}, hollowCircle);
	//注册实体可draggable
	instance.repaintEverything();
}

$(function() {
	registerD('d1');
	registerD('d2');
});
