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
m.px = 0; //Plaer x,y,z
m.pz = 5;
m.py = 0;
m.lx = 0; //Look x,y,z
m.lz = 0;
m.ly = 0;
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
              //Position/ID   //Color   //Intensity
    constructor(x, y, z, id,   r, g, b,   i) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.id = id;
        this.r = r;
        this.g = g;
        this.b = b;
		this.i = i;
		console.log(i);
    }

    get_ID() {
        return this.id;
    }
	
	get_Intensity() {
        return this.i;
    }
    
    get_Pos() {
        var pos = [this.x, this.y, this.z];
        return pos;
    }

    get_Color() {
        var color = [this.r, this.g, this.b];
        return color;
    }
}