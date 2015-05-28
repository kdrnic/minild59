var pressed = [];
var preventDefault = false;
var mouse = {};

function MouseUpEvent(event){
	mouse.pressed[event.button] = false;
}

function MouseDownEvent(event){
	mouse.pressed[event.button] = true;
	
	var rect = canvas.getBoundingClientRect();
	mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
	mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
}

function LoadTextFile(f, c){
	var msg = new XMLHttpRequest();
	msg.open("GET", f, true);
	msg.onreadystatechange = function(event){
		if(msg.readyState === 4){  
			if(msg.status === 200){
				c(msg.responseText);
			}
			else{  
				console.log(msg.statusText);
			}  
		}
	} 
	try{
		msg.send();
	}
	catch(e){
		console.log(e.message);
	}
}

function Start(){
	canvas = document.getElementById("screen");
	context = canvas.getContext("2d");
	
	window.addEventListener("keyup", function (event){
		pressed[event.keyCode] = false;
	});
	window.addEventListener("keydown", function (event){
		pressed[event.keyCode] = true;
	});
	
	mouse.pressed = [];
	canvas.addEventListener("mousedown", MouseDownEvent);
	canvas.addEventListener("mouseup", MouseUpEvent);
	
	scrollX = 0;
	scrollY = 0;
	
	var t = new Image();
	t.onload = function(){ 
		tileset = BreakImage(this, 16, 16);
		window.requestAnimationFrame(DoFrame);
	}
	t.src = "tileset.png";
	
	frame = 0;
}

function DoFrame(){
	frame++;
	Draw();
	Update();
	window.requestAnimationFrame(DoFrame);
}

function Update(){
	UpdateKeys();
}

function Draw(){
	context.save();
	context.translate(-scrollX, -scrollY);
	MapDraw();
	context.restore();
}

function BreakImage(img, w, h){
	var c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	var ctx = c.getContext("2d");
	var imgs = [];
	for(var y = 0; y < (img.height / h) >> 0; y++){
		for(var x = 0; x < (img.width / w) >> 0; x++){
			ctx.clearRect (0, 0, c.width, c.height);
			ctx.drawImage(img, x * w, y * h, w, h, 0, 0, w, h);
			var i = new Image();
			i.src = c.toDataURL();
			imgs.push(i);
		}
	}
	return imgs;
}

function MapDraw(){
	if(!window.hasOwnProperty("map")) return;
	for(var i = scrollX >> 4; i < Math.min(1 + (scrollX + canvas.width) >> 4, map.length); i++){
		for(var j = scrollY >> 4; j < Math.min(1 + (scrollY + canvas.height) >> 4, map[i].length); j++){
			context.drawImage(tileset[map[i][j]], i * 16, j * 16);
		}
	}
}

function CanvasZoom(factor){
	if((canvas.style.width.split("px")[0] / canvas.width > 1) || (factor > 1)){
		canvas.style.width = canvas.style.width.split("px")[0] * factor;
		canvas.style.height = canvas.style.height.split("px")[0] * factor;
	}
}