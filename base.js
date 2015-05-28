var mouse = {};
var pressed = [];
var entityConstructors = {};
var entities = [];

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
		LoadTextFile("level.json", function(m){
			InitMap(JSON.parse(m));
			window.requestAnimationFrame(DoFrame);
		});
	}
	t.src = "tileset.png";
	
	frame = 0;
}

function InitMap(jsonObj){
	var tileLayer = null, objLayer = null;
	for(var i = 0; i < jsonObj.layers.length; i++){
		if(jsonObj.layers[i].type == "tilelayer") tileLayer = jsonObj.layers[i];
		if(jsonObj.layers[i].type == "objectgroup") objLayer = jsonObj.layers[i];
	}
	if(tileLayer){
		map = [];
		for(var x = 0; x < tileLayer.width; x++){
			map[x] = [];
			for(var y = 0; y < tileLayer.height; y++){
				map[x][y] = tileLayer.data[x + y * tileLayer.width] - 1;
			}
		}
	}
	if(objLayer){
		for(var i = 0; i < objLayer.objects.length; i++){
			if(!entityConstructors.hasOwnProperty(objLayer.objects[i].type)) continue;
			var e = new entityConstructors[objLayer.objects[i].type]();
			e.Init(objLayer.objects[i]);
			 entities.push(e);
		}
	}
}

function DoFrame(){
	frame++;
	Draw();
	Update();
	window.requestAnimationFrame(DoFrame);
}

function Update(){
	UpdateKeys();
	UpdateEntities();
}

function UpdateEntities(){
	for(var i = 0; i < entities.length; i++){
		if(typeof entities[i].Update == "function") entities[i].Update();
	}
	MoveEntities();
}

function Entity(){
}

Entity.prototype.Init = function(obj){
	this.x = obj.x << 8;
	this.y = obj.y << 8;
}

Entity.prototype.MapCollision = function(){
	if(!this.solid) return false;
	for(var x = this.x >> 12; x <= (this.x + 0xf00) >> 12; x++){
		if(x < 0) continue;
		if(x >= map.length) continue;
		for(var y = this.y >> 12; y <= (this.y + 0xf00) >> 12; y++){
			if(y < 0) continue;
			if(y >= map[x].length) continue;
			if((map[x][y] >= 32) && (map[x][y] < 48)) return true;
		}
	}
	return false;
}

function MoveEntities(){
	for(var i = 0; i < entities.length; i++){
		var e = entities[i];
		if(e.dx){
			e.x += e.dx;
			if(e.MapCollision()){
				if(e.dx > 0) e.x -= e.x & 0xfff;
				if(e.dx < 0) e.x += ((~(e.x & 0xfff)) >>> 0);
			}
		}
		if(e.dy){
			e.y += e.dy;
			if(e.MapCollision()){
				if(e.dy > 0) e.y -= e.y & 0xfff;
				if(e.dy < 0) e.y += ((~(e.y & 0xfff)) >>> 0);
			}
		}
	}
}

function Draw(){
	context.fillRect(0, 0, 256, 240);
	context.save();
	context.translate(-scrollX, -scrollY);
	MapDraw();
	DrawEntities();
	context.restore();
}

function DrawEntities(){
	for(var i = 0; i < entities.length; i++){
		if(entities[i].hasOwnProperty("sprTile")){
			context.drawImage(tileset[entities[i].sprTile], entities[i].x >> 8, entities[i].y >> 8);
		}
	}
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
	for(var i = Math.max(Math.floor(scrollX / 16), 0); i < Math.min(1 + Math.floor((scrollX + canvas.width) / 16), map.length); i++){
		for(var j = Math.max(Math.floor(scrollY / 16), 0); j < Math.min(1 + Math.floor((scrollY + canvas.height) / 16), map[i].length); j++){
			if(map[i][j] >= 0) context.drawImage(tileset[map[i][j]], i * 16, j * 16);
		}
	}
}

function CanvasZoom(factor){
	if((canvas.style.width.split("px")[0] / canvas.width > 1) || (factor > 1)){
		canvas.style.width = canvas.style.width.split("px")[0] * factor;
		canvas.style.height = canvas.style.height.split("px")[0] * factor;
	}
}

function Player(obj){
	this.sprTile = 0;
	this.solid = true;
}

Player.prototype = new Entity;

Player.prototype.Update = function(){
	if(keys.keyRight.state){
		this.dx += 0xf0;
	}
	else if(keys.keyLeft.state){
		this.dx -= 0xf0;
	}
	else this.dx = this.dx >> 2;
	if((keys.keyUp.state == 1) && (true)){
		this.dy = -0x500;
	}
	else this.dy += 0x80;
	if(this.dx < -0x300) this.dx = -0x300;
	if(this.dx > 0x300) this.dx = 0x300;
	if(this.dy > 0x500) this.dy = 0x500;
	scrollX = (this.x >> 8) + 8 - 128;
	scrollY = (this.y >> 8) + 8 - 128;
}

entityConstructors["player"] = Player;
