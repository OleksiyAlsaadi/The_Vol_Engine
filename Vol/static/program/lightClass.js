///////////////////////////////////////////
///        Mouse Lock                   ///
///////////////////////////////////////////
var x = 0;
var y = 0;
var canvas = document.getElementById('webgl');
//var canvas = document.getElementById('b');
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

canvas.onclick = function() {
  canvas.requestPointerLock();
}
document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
  if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
    document.addEventListener('mousemove', updatePosition, false);
  }else{
    document.removeEventListener('mousemove', updatePosition, false);
  }
}

function updatePosition(e){
  x = e.movementX;
  y = e.movementY;
}

////////////////////////////////////////////
//      Movement and animation variables  //
////////////////////////////////////////////
m = new Object();
m.px = Math.random() * 32; //Player x,y,z
m.pz = Math.random() * 32;
m.py = 25;
m.lx = 0; //Look x,y,z
m.lz = 0;
m.ly = 25;
m.turn = -90;
m.jump = 0.0;
m.dir = 0;
m.angle = 0.0;
m.ro = 0x03; //Rotation
m.clight = 0; //Add or Delete light (1 or -1)
m.day = 1;


/////////////////////////////////////////////////////
//    Light Objects hold Position and Color        //
/////////////////////////////////////////////////////
class LightObject {
              //Position/ID   //Color   //Intensity //Delta     //Lifetime //who sho tit
    constructor(x, y, z, id,   r, g, b,   i,         dx,dy,dz,  time,      pl) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.id = id;
        this.r = r;
        this.g = g;
        this.b = b;
		    this.i = i;
		    //console.log(i);
        this.dx = dx;
        this.dy = dy;
        this.dz = dz;
        this.time = time;
        this.player = pl;
    }

    get_ID() {
        return this.id;
    }
	
	  get_Intensity() {
        return this.i;
    }

    set_Intensity(i) {
        this.i = i;
    }

    get_Delta(){
        var pos = [this.dx, this.dy, this.dz];
        return pos;
    }
    
    get_Pos() {
        var pos = [this.x, this.y, this.z];
        return pos;
    }

    set_Pos(x,y,z){
      this.x = x;
      this.y = y;
      this.z = z;
    }

    get_Color() {
        var color = [this.r, this.g, this.b];
        return color;
    }

    get_Time(){
      return this.time;
    }

    set_Time(time){
       this.time = time;
    }

    get_Player(){
        return this.player;
    }
}

