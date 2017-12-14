pace.js – 网页自动加载进度条插件  

在页面中引入Pace.js，页面就会自动监测你的请求（包括Ajax请求），在事件循环滞后，会在页面记录加载的状态以及进度情况。
此插件的兼容性很好，可以兼容IE8以上的所有主流插件，并且可以引入加载进度条的主题样式，可以选择任意颜色和多种动画效果（例如简约、闪光灯，MAC OSX，左侧填充，顶部填充，计数器和弹跳等等动画效果），为网站增添个性化特色！  


###Pace.js公开的API列表：  
Pace.start：开始显示进度条，如果你不是使用AMD或者Browserify来加载模块的话，这个会默认执行。  
Pace.restart：进度条重新加载以及显示。  
Pace.stop：隐藏进度条以及停止加载。  
Pace.track：监测一个或者多个请求任务。  
Pace.ignore：忽略一个或者多个请求任务。  


###Example

```
	<head>
	  <script src="/pace/pace.js"></script>
	  <link href="/pace/themes/pace-theme-barber-shop.css" rel="stylesheet" />
	</head>
```  

###Configuration
