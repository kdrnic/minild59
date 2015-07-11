var mouse = {};
var pressed = [];
var entityConstructors = {};
var entities = [];
var tileTypes = [];
var lastFrameTime;
var frameTime = 1000 / 60;

function Timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

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
	
	scroll = {
		x: 0,
		y: 0,
		width: 0x10000,
		height: 240 << 8
	};
	
	var t = new Image();
	t.onload = function(){ 
		tileset = BreakImage(this, 16, 16);
		LoadTextFile("level.json", function(m){
			InitMap(JSON.parse(m));
			window.requestAnimationFrame(Draw);
			lastFrameTime = Timestamp();
			setTimeout(Update, 0.9 * frameTime);
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
		for(var t in jsonObj.tilesets[0].tileproperties){
			tileTypes[t] = jsonObj.tilesets[0].tileproperties[t];
			tileTypes[t].collision = tileTypes[t].collision | 0;
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

function Update(){
	var t = Timestamp();
	while(t - lastFrameTime < frameTime){
		t = Timestamp();
	}
	frame++;
	UpdateKeys();
	UpdateEntities();
	lastFrameTime = Timestamp();
	setTimeout(Update, 0.95 * frameTime);
}

function UpdateEntities(){
	for(var i = 0; i < entities.length; i++){
		if(typeof entities[i].Update == "function") entities[i].Update();
	}
	MoveEntities();
	for(var i = 0; i < entities.length; i++){
		if(!entities[i].alive) entities.splice(i, 1);
	}
}

function MapCollision(box){
	for(var x = box.x >> 12; x <= (box.x + (box.width | 0)) >> 12; x++){
		if(x < 0) continue;
		if(x >= map.length) continue;
		for(var y = box.y >> 12; y <= (box.y + (box.height | 0)) >> 12; y++){
			if(y < 0) continue;
			if(y >= map[x].length) continue;
			if(map[x][y] == -1) continue;
			switch(tileTypes[map[x][y]].collision){
			case 1:
				return true;
				break;
			case 2:
				if(box.hasOwnProperty("dy")){
					if(box.y + box.height - box.dy < y << 12) return true;
				}
				else return true;
				break;
			default:
				break;
			}
		}
	}
	return false;
}

function MoveEntities(){
	for(var i = 0; i < entities.length; i++){
		var e = entities[i];
		if(e.dx){
			e.x += e.dx;
			if(e.solid && MapCollision(e)){
				if(e.dx > 0) e.x -= e.x & 0xfff;
				if(e.dx < 0) e.x += 1 + ((~(e.x & 0xfff)) >>> 0) & 0xfff;
				e.dx = 0;
			}
		}
		if(e.dy){
			e.y += e.dy;
			if(e.solid && MapCollision(e)){
				if(e.dy > 0) e.y -= e.y & 0xfff;
				if(e.dy < 0) e.y += 1 + ((~(e.y & 0xfff)) >>> 0) & 0xfff;
				e.dy = 0;
			}
		}
		if(typeof e.EndUpdate == "function") e.EndUpdate();
	}
}

function Draw(){
	context.fillRect(0, 0, 256, 240);
	context.save();
	context.translate(-scroll.x, -scroll.y);
	MapDraw();
	DrawEntities();
	context.restore();
	window.requestAnimationFrame(Draw);
}

function DrawEntities(){
	for(var i = 0; i < entities.length; i++){
		if(entities[i].hasOwnProperty("sprTile")){
			context.save();
			context.translate(8 + (entities[i].x >> 8), 8 + (entities[i].y >> 8));
			context.scale(1 - ((entities[i].flipH | 0) << 1), 1 - ((entities[i].flipV | 0) << 1));
			context.drawImage(tileset[entities[i].sprTile], -8, -8);
			context.restore();
		}
	}
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
	for(var i = Math.max(Math.floor(scroll.x / 16), 0); i < Math.min(1 + Math.floor((scroll.x + canvas.width) / 16), map.length); i++){
		for(var j = Math.max(Math.floor(scroll.y / 16), 0); j < Math.min(1 + Math.floor((scroll.y + canvas.height) / 16), map[i].length); j++){
			if(map[i][j] >= 0) context.drawImage(tileset[map[i][j]], i * 16, j * 16);
		}
	}
}

function CanvasZoom(factor){
	if(factor > 0){
		canvas.style.width = parseInt(canvas.style.width.split("px")[0]) + canvas.width;
		canvas.style.height = parseInt(canvas.style.height.split("px")[0]) + canvas.height;
	}
	else if(canvas.style.width.split("px")[0] > 256){
		canvas.style.width = parseInt(canvas.style.width.split("px")[0]) - canvas.width;
		canvas.style.height = parseInt(canvas.style.height.split("px")[0]) - canvas.height;
	}
}

function BoxCollision(b1, b2){
	if(b1.x + b1.width < b2.x) return false;
	if(b1.x > b2.x + b2.width) return false;
	if(b1.y + b1.height < b2.y) return false;
	if(b1.y > b2.y + b2.height) return false;
	return true;
}

function Entity(){
	this.width = 0xfff;
	this.height = 0xfff;
}

Entity.prototype.alive = true;

Entity.prototype.Init = function(obj){
	this.x = obj.x << 8;
	this.y = obj.y << 8;
}

Entity.prototype.Animate = function(spr){
	this.sprTile = spr;
	if((Math.abs(this.dx | 0) & 0xf00) != 0) this.sprTile += [0,1,0,2][(Math.floor(frame / 7) % 4)];
	if(this.dx < 0) this.flipH = true;
	if(this.dx > 0) this.flipH = false;
}

function Player(obj){
	this.sprTile = 0;
	this.solid = true;
	this.stunCounter = 0;
}

Player.prototype = new Entity;

Player.prototype.Update = function(){
	if(!(this.stunCounter > 0)){
		if(keys.keyRight.state){
			this.dx += 0xf0;
		}
		else if(keys.keyLeft.state){
			this.dx -= 0xf0;
		}
		else{
			if(this.dx == -1) this.dx = 0;
			this.dx = this.dx >> 2;
			this.sprTile = 3;
		}
	}
	
	this.Animate(3);
	
	if((keys.keyUp.state == 1) &&
		(MapCollision({x: this.x, y: this.y + 0x1000}) ||
		MapCollision({x: this.x + this.width, y: this.y + 0x1000}))){
		this.dy = -0x600;
	}
	else this.dy += 0x60;
	
	if(this.dx < -0x300) this.dx = -0x300;
	if(this.dx > 0x300) this.dx = 0x300;
	if(this.dy > 0x600) this.dy = 0x600;
	
	if(this.stunCounter > 0) this.stunCounter--;
}

Player.prototype.EndUpdate = function(){
	scroll.x = (this.x >> 8) + 8 - 128;
	scroll.y = (this.y >> 8) + 8 - 128;
	if(scroll.x < 0) scroll.x = 0;
	if(scroll.x + 256 > map.length << 4) scroll.x = (map.length << 4) - 256;
	if(scroll.y < 0) scroll.y = 0;
	if(scroll.y + 240 > map[0].length << 4) scroll.y = (map[0].length << 4) - 240;
}

Player.prototype.Hurt = function(other){
	if(this.y + this.height <= other.y + other.height){
		this.dy = -8 * 0xb5;
		this.dx = 0xb5;
	}
	else this.dx = 1;
	
	if(this.x + (this.width >> 1) > other.x + (other.width >> 1)){
		this.dx *= 8;
	}
	else this.dx *= -8;
	
	this.stunCounter = 20;
}

entityConstructors["player"] = Player;

function CheckPlayerCollision(o, f){
	entities.forEach(function (e){
		if(e instanceof Player){
			if(BoxCollision(o, e)){
				f.call(o, e);
			}
		}
	});
}

function Potion(){
	this.sprTile = 31;
}

function Heart(){
	this.sprTile = 30;
}

Potion.prototype = new Entity;
Heart.prototype = new Entity;
entityConstructors["potion"] = Potion;
entityConstructors["heart"] = Heart;

function WalkingEnemy(){
	this.flipH = true;
	this.dy = 0;
	this.solid = true;
}

WalkingEnemy.prototype = new Entity;

WalkingEnemy.prototype.Update = function(){
	if((!MapCollision({x: this.x, y: this.y + 0x1000})) || MapCollision({x: this.x - 1, y: this.y + 0xf00})){
		this.flipH = false;
	}
	
	if((!MapCollision({x: this.x + this.width, y: this.y + 0x1000})) || MapCollision({x: this.x + this.width + 1, y: this.y + 0xf00})){
		this.flipH = true;
	}
	
	if(!this.flipH) this.dx = 0x100;
	else this.dx = -0x100;
	
	this.dy += 0x60;
	if(this.dy > 0x600) this.dy = 0x600;
	
	CheckPlayerCollision(this, function(p){
		p.Hurt(this);
	});
	
	this.Animate(12);
}

entityConstructors["enemy1"] = WalkingEnemy;

function MedusaSpawner(){
	this.period = 120;
}

MedusaSpawner.prototype = new Entity;

MedusaSpawner.prototype.Init = function(obj){
	this.width = (obj.width << 8) - 1;
	this.height = (obj.height << 8) - 1;
	Entity.prototype.Init.call(this, obj);
}

MedusaSpawner.prototype.Update = function(){
	if(BoxCollision(this, {x: scroll.x << 8, y: scroll.y << 8, width: (256 << 8) - 1, height: (240 << 8) - 1}) && (frame % this.period == 0)){
		var m = new MedusaHead();
		m.x = (scroll.x << 8) + 0x10000;
		m.y = this.y - (sineTable.reduce(function(a,b){return a+b}) * 3);
		entities.push(m);
	}
}

entityConstructors["medusa"] = MedusaSpawner;

var sineTable = Array(10);
for(var i = 0; i < sineTable.length; i++) sineTable[i] = (Math.sin((i / sineTable.length) * Math.PI * 0.5) * 0x100) | 0;

function MedusaHead(){
	this.period = 30;
	this.sprTile = 18;
	this.dx = -0x100;
}

MedusaHead.prototype = new Entity;

MedusaHead.prototype.Update = function(){
	switch(((frame % (this.period << 2)) / this.period) | 0){
	case 0:
		this.dy = sineTable[((frame % this.period) * (sineTable.length / this.period)) | 0];
		break;
	case 1:
		this.dy = sineTable[(sineTable.length - 1) - (((frame % this.period) * (sineTable.length / this.period)) | 0)];
		break;
	case 2:
		this.dy = 0 - sineTable[((frame % this.period) * (sineTable.length / this.period)) | 0];
		break;
	case 3:
		this.dy = 0 - sineTable[(sineTable.length - 1) - (((frame % this.period) * (sineTable.length / this.period)) | 0)];
		break;
	}
	this.dy = (this.dy << 1) + this.dy;
	
	CheckPlayerCollision(this, function(p){
		p.Hurt(this);
	});
	
	if(this.x + this.width < scroll.x << 8) this.alive = false;
}