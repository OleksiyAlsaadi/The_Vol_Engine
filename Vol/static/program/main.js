/*
  @author Oleksiy Al-saadi
*/

// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
  `
  attribute vec2 a_TexCoord;

  attribute vec4 a_Position;
  attribute vec3 a_Normal;
  attribute vec4 a_Color;
  attribute vec3 a_Tangent;
  attribute vec3 a_BiTangent;

  //Matrices
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec2 v_TexCoord;

  varying vec3 v_Normal;
  varying vec3 v_Position;

  varying vec4 v_Color;

  varying mat3 v_TBN;
  varying vec3 FragPos;
  varying vec3 viewPos;

  varying vec4 rPosition;

  //Fog
  uniform vec4 u_Eye;
  varying float v_Dist;

  void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    rPosition = gl_Position;
    FragPos = vec3(u_ModelMatrix * a_Position);
    viewPos = vec3(u_ProjMatrix * a_Position);

    v_TexCoord = a_TexCoord;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Color = a_Color;

    vec3 T = normalize( vec3(u_ModelMatrix * vec4(a_Tangent, 0.0)).xyz);
    vec3 B = normalize( vec3(u_ModelMatrix * vec4(a_BiTangent, 0.0)));
    vec3 N = normalize( vec3(u_ModelMatrix * vec4(a_Normal, 0.0)));
    mat3 TBN = mat3(T, B, N);
    v_TBN = TBN;

    v_Normal = normalize(vec3(u_NormalMatrix) * a_Normal);
	//Normal = mat3(transpose(inverse(u_ModeMatrix))) * a_Normal;
	
    v_Dist = distance(u_ModelMatrix * a_Position, u_Eye);
  }`

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
  `
  #ifdef GL_ES
  precision mediump float;
  #endif

  //Texture
  uniform sampler2D u_Sampler;
  uniform sampler2D normalMap;
  uniform samplerCube u_Skybox;

  //Light Variables and Vectors
  uniform vec3 u_LightColor;
  uniform vec3 u_LightPosition;
  uniform vec3 u_LightColor2;
  uniform vec3 u_LightPosition2;
  
  const int nL = 7;
  uniform vec3 u_LightColorArray[nL];
  uniform vec3 u_LightPositionArray[nL];
  uniform float u_LightIntensityArray[nL];
  uniform int u_LightActive[nL];

  uniform vec3 u_AmbientLight;

  //Sunlight
  uniform vec3 u_DiffuseLight;
  uniform vec3 u_LightDirection;

  //Fog
  uniform vec3 u_FogColor;
  uniform vec2 u_FogDist;
  uniform vec4 u_Eye2;
  varying float v_Dist;

  //Bump Mapping
  varying vec3 viewPos;
  varying vec2 v_TexCoord;
  varying vec3 v_Position;

  varying vec4 v_Color;
  varying mat3 v_TBN;
  varying vec3 FragPos;
  varying vec3 v_Normal;

  //Special
  uniform int u_Special;
  uniform int u_Reflect;
	 


  void main() {

  
    //Normal Maps
    vec3 testNormal = texture2D(normalMap, v_TexCoord).rgb;
    testNormal = normalize(testNormal * 2.0 -1.0);
    testNormal.xyz = normalize(v_TBN * testNormal);

	
	//Reflections
	vec3 I = normalize(v_Position - vec3(u_Eye2));
	vec3 R = reflect(I, testNormal);
	
	vec4 color;
	if (u_Reflect >= 0){ //No Reflection, only Material
		color = texture2D(u_Sampler, v_TexCoord);
	}

	if (u_Reflect == 3){ //Reflect (half) and Material
		color = (textureCube(u_Skybox, R)*.4) + texture2D(u_Sampler, v_TexCoord)*.6;
	}
	
	//vec2 onePixel = vec2(1.0, 1.0) / vec(2048.0,2048.0);
	
	/*if (u_Reflect == 1){ //Reflect and Material
		color = textureCube(u_Skybox, R) * texture2D(u_Sampler, v_TexCoord);
	}*/
	if (u_Reflect == 2){ //Only Reflect
		color = textureCube(u_Skybox, R);
		gl_FragColor = color;
		return;
	}
	
	if (u_Special == 1){ //Early Exit (ex: Skybox)
		gl_FragColor = color;
		return;
	}

    //Sunlight
    float nDotL_Sun = max(dot(u_LightDirection, testNormal), 0.0); //Sunlight
    vec3 diffuse_Sun = u_DiffuseLight * color.rgb * nDotL_Sun; //Sunlight

    //Ambient
    vec3 ambient = u_AmbientLight * color.rgb;
    vec3 added = diffuse_Sun + ambient;

    float specularStrength = 1.0;
    float spec = 0.0;
	
	

    for(int n = 0; n < nL; n++){
      if (u_LightActive[n] == 1){

        //Diffuse Lighting

        vec3 LightDirection = normalize(u_LightPositionArray[n] - v_Position);
        float nDotL = max(dot(LightDirection, testNormal), 0.0);
        vec3 diffuse = u_LightColorArray[n] * color.rgb * nDotL;
		
		//3D Pythagorean Theorem to determine light intensity
		float xd = u_LightPositionArray[n][0] - vec3(v_Position)[0];
		float yd = u_LightPositionArray[n][1] - vec3(v_Position)[1];
		float zd = u_LightPositionArray[n][2] - vec3(v_Position)[2];
		
		float pyth = sqrt(xd*xd + yd*yd + zd*zd) / u_LightIntensityArray[n]; //Divide by Intensity
		float dist = max(min(1.5 - pyth, 1.0), 0.0);
		if (dist > 0.0){
			added += vec3(diffuse[0]*dist, diffuse[1]*dist, diffuse[2]*dist);
			//added += diffuse; //Without light intensity
		}

        //Specular Lighting

		if (u_Special != 2){
			vec3 reflectVec;
			if (u_LightColorArray[n] != vec3(0,0,0) ){
				reflectVec = reflect(-LightDirection, testNormal);
			}
			
			vec3 viewDir = normalize(viewPos - FragPos + vec3(u_Eye2));
			spec += pow(max(dot(viewDir, reflectVec), 0.0)*min(dist*2.0, 1.0), 32.0);
		}

      }else{
        break;
      }
    } 

	if (u_Special != 2){
		added += specularStrength * spec * color.rgb;
	}
	

    //Fog Effect
    //float fogFactor = clamp((u_FogDist.y - v_Dist) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);
    //vec3 fogColor = mix(u_FogColor, vec3(v_Color), fogFactor);
	//added += fogColor;
	
    gl_FragColor = vec4(added, color.a);
	
	/*vec4 BrightColor;
	
	float brightness = dot(gl_FragColor.rgb, vec3(0.4126, 0.7152, 0.4722));
    if(brightness > 1.0)
        BrightColor = vec4(gl_FragColor.rgb, 1.0);
    else
        BrightColor = vec4(0.0, 0.0, 0.0, 1.0);
		
	gl_FragColor = BrightColor; */
	

  }`
  

  
  
var LIGHT_FSHADER_SOURCE =
  `
  //Texture
  uniform sampler2D u_Sampler;
  uniform sampler2D normalMap;
  
  uniform vec4 fragColor;


  void main() {

  
    gl_FragColor = fragColor;
	vec4 BrightColor;
	
	float brightness = dot(gl_FragColor.rgb, vec3(0.4126, 0.7152, 0.4722));
    if(brightness > 1.0)
        BrightColor = vec4(gl_FragColor.rgb, 1.0);
    else
        BrightColor = vec4(0.0, 0.0, 0.0, 1.0);
		
	gl_FragColor = BrightColor;

  }`
  
  

var g_modelMatrix = new Matrix4();
var g_viewMatrix = new Matrix4();
var g_projMatrix = new Matrix4();
var normalMatrix = new Matrix4();














//Game //////////////////////////////////////////////////////////////


var boxS;
var show = 1;

function main() {
	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');
	var post_canvas = document.getElementById('post');

	//Dynamic Canvas size
	canvas.height = window.innerHeight
		|| document.documentElement.clientHeight
		|| document.body.clientHeight;
	canvas.height *= .85;
	canvas.width = canvas.height;
	post_canvas.height = canvas.height;
	post_canvas.width = canvas.width;

	var mainCanvas = document.getElementById("mainCanvas");
	var postEffects = document.getElementById("postEffects");

	// Get the rendering context for WebGL
	var gl = getWebGLContext(canvas);
	var ctx = post_canvas.getContext("2d");

	// Initialize shaders
	var texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
	//var lightProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, LIGHT_FSHADER_SOURCE);
	gl.useProgram(texProgram);

	// Get storage locations of attribute and uniform variables in program object for texture drawing
	texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
	texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
	texProgram.a_Normal = gl.getAttribLocation(texProgram, 'a_Normal');
	texProgram.a_Tangent = gl.getAttribLocation(texProgram, 'a_Tangent');
	texProgram.a_BiTangent = gl.getAttribLocation(texProgram, 'a_BiTangent');

	//get storage location for uniform variables
	texProgram.u_ProjMatrix = gl.getUniformLocation(texProgram, 'u_ProjMatrix');
	texProgram.u_ViewMatrix = gl.getUniformLocation(texProgram, 'u_ViewMatrix');
	texProgram.u_ModelMatrix = gl.getUniformLocation(texProgram, 'u_ModelMatrix');
	texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');
	texProgram.normalMap = gl.getUniformLocation(texProgram, 'normalMap');
	texProgram.u_Skybox = gl.getUniformLocation(texProgram, 'u_Skybox');
	texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, 'u_NormalMatrix');

	//Ambient Light
	texProgram.u_AmbientLight = gl.getUniformLocation(texProgram, 'u_AmbientLight');    

	//Point Array Active
	for (var n = 0; n < 10; n++){
		texProgram.u_LightActive = gl.getUniformLocation(texProgram, "u_LightActive["+ n +"]");
		gl.uniform1i(texProgram.u_LightActive, 0); 
	}

	//Point light 1
	texProgram.u_LightColor = gl.getUniformLocation(texProgram, 'u_LightColor');
	texProgram.u_LightPosition = gl.getUniformLocation(texProgram, 'u_LightPosition');
   
	//Point light 2
	texProgram.u_LightColor2 = gl.getUniformLocation(texProgram, 'u_LightColor2');
	texProgram.u_LightPosition2 = gl.getUniformLocation(texProgram, 'u_LightPosition2');

	//Sunlight
	texProgram.u_DiffuseLight = gl.getUniformLocation(texProgram, 'u_DiffuseLight');
	texProgram.u_LightDirection = gl.getUniformLocation(texProgram, 'u_LightDirection');

	//Special 
	texProgram.u_Special = gl.getUniformLocation(texProgram, 'u_Special');
	gl.uniform1i(texProgram.u_Special, 0);
	texProgram.u_Reflect = gl.getUniformLocation(texProgram, 'u_Reflect');
	gl.uniform1i(texProgram.u_Reflect, 0);
	

    
	// Color of Fog
	var fogColor = new Float32Array([0.137, 0.231, 0.423]); //0.137, 0.231, 0.423
	// Distance of fog [where fog starts, where fog completely covers object]
	var fogDist = new Float32Array([15, 25]);
	// Position of eye point (world coordinates)
	var eye = new Float32Array([0,0,0, 1.0]);
	texProgram.u_Eye = gl.getUniformLocation(texProgram, 'u_Eye');
	texProgram.u_Eye2 = gl.getUniformLocation(texProgram, 'u_Eye2');
	texProgram.u_FogColor = gl.getUniformLocation(texProgram, 'u_FogColor');
	texProgram.u_FogDist = gl.getUniformLocation(texProgram, 'u_FogDist');
	

	// Set the vertex information
	var cube = initVertexBuffers(gl, myCube);
	var sphere = initVertexBuffers(gl, mySphere);
	var torus = initVertexBuffers(gl, myTorus);
	
	if (!cube || !sphere || !torus) {
		console.log('Failed to set the vertex information');
		return;
	}
	var sphereMaterial = initTextures(gl, texProgram, './static/program/Textures/Sphere/mySphere_Sphere_BaseColor.png', 0);
	var sphereNormalMap = initTextures(gl, texProgram, './static/program/Textures/Sphere/mySphere_Sphere_Normal.png', 1);
	if (!sphereMaterial) {
		console.log('Failed to intialize the texture.');
		return;
	}
    
	var torusMaterial = initTextures(gl, texProgram, './static/program/Textures/Torus/torusBase.png', 0);
	var torusNormalMap = initTextures(gl, texProgram, './static/program/Textures/Torus/torusNormal.png', 1);
	if (!torusMaterial) {
		console.log('Failed to intialize the texture.');
		return;
	}

	var woodMaterial = initTextures(gl, texProgram, './static/program/Textures/Panel/WoodPanel.png', 0);
	var woodNormal = initTextures(gl, texProgram, './static/program/Textures/Panel/WoodNormal.png', 1);
	if (!woodMaterial) {
		console.log('Failed to intialize the texture.');
		return;
	}  

	var brickMaterial = initTextures(gl, texProgram, './static/program/Textures/BrickBaseColor.png', 0);
	var brickNormal = initTextures(gl, texProgram, './static/program/Textures/BrickNormal.png', 1);
	if (!brickMaterial) {
		console.log('Failed to intialize the texture.');
		return;
	}
	
	var solidGray = initTextures(gl, texProgram, './static/program/Textures/SolidGray_BaseColor.png', 0);
	var solidGrayNormal = initTextures(gl, texProgram, './static/program/Textures/SolidGray_Normal.png', 1);

	var blueMarbleMaterial = initTextures(gl, texProgram, './static/program/Textures/Chess/Blue_Marble_color.jpg', 0);
	var blueMarbleNormal = initTextures(gl, texProgram, './static/program/Textures/Chess/Blue_Marble_normal.jpg', 1);
	
	var concreteMaterial = initTextures(gl, texProgram, './static/program/Textures/Chess/concrete.jpg', 0);
	
	var plasterMaterial = initTextures(gl, texProgram, './static/program/Textures/Misc/plaster_diffuse.jpg', 0);
	var plasterNormal = initTextures(gl, texProgram, './static/program/Textures/Misc/plaster_normal.jpg', 1);
	
	var concreteMaterial = initTextures(gl, texProgram, './static/program/Textures/Chess/concrete.jpg', 0);
	
	var grassMaterial = initTextures(gl, texProgram, './static/program/Textures/Misc/grass.jpg', 0);
	
	var tileMaterial = initTextures(gl, texProgram, './static/program/Textures/Panel/tilePanel.png', 0);
	var tileNormal = initTextures(gl, texProgram, './static/program/Textures/Panel/tileNormal.png', 1);
	
	var geoMaterial = initTextures(gl, texProgram, './static/program/Textures/Panel/geoPanel.png', 0);
	var geoNormal = initTextures(gl, texProgram, './static/program/Textures/Panel/geoNormal.png', 1);
	
	var skyTex  = initTextures(gl, texProgram, './static/program/Textures/Sky/skybox_texture.jpg', 0);
	var skyTex2 = initTextures(gl, texProgram, './static/program/Textures/Sky/skybox_texture2.jpg', 0);
	skyBox = initCube(gl, myCube);
	land = initPlane(gl, myTorus);
	
	var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the texture object');
        return null;
    }

    var image = new Image();  // Create a image object
    if (!image) {
        console.log('Failed to create the image object');
        return null;
    }
	
	

	function loadCubeMap(scene) {
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		var str = "./static/program/Textures/Sky/"
		var day = "Bright/"
		day = scene; // or Day/
		
		var faces = [[str+day+"skybox_right.jpg",  gl.TEXTURE_CUBE_MAP_POSITIVE_X],
					 [str+day+"skybox_left.jpg",   gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
					 [str+day+"skybox_top.jpg",    gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
					 [str+day+"skybox_bottom.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
					 [str+day+"skybox_front.jpg",  gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
					 [str+day+"skybox_back.jpg",   gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];
					 
		for (var i = 0; i < faces.length; i++) {

			var face = faces[i][1];
			var image = new Image();
			image.onload = function(texture, face, image) {
				return function() {
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
					
					gl.activeTexture(gl.TEXTURE2); //Set unit for Skybox
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
					gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
					
					gl.useProgram(texProgram);
					gl.uniform1i(texProgram.u_Skybox, 2);
					
					gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
				}
			} (texture, face, image);
			image.src = faces[i][0];
		}
		return texture;
	}
	boxDay = loadCubeMap("Day/");
	boxBright = loadCubeMap("Bright/");


	// Set the clear color and enable the depth test
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);



	var viewMatrix = new Matrix4();
	var projMatrix = new Matrix4();

	var viewProjMatrix = {viewMatrix, projMatrix};

	document.onkeydown = function(e){ checkKey(e, m, 5) };
	document.onkeyup = function(e){ checkKey(e, m, 0) };

	
	//Point lights      //Pos              //Color          //Intensity
	var k = createLight(-0.4, 0.0, 2.0,     0.6, 0.6, 0.6,   10.0); 
	var k = createLight(0.4, 0.5, -2.3,    .3, .3, .8,       5.0); 
	//Overhead light with random color
	var r = Math.random() * .3; var g = Math.random() * .3; var b = Math.random() * .3;
	var k = createLight(20, 4, 20.0,     0.5+r, 0.5+g, 0.5+b,   20.0); 
	//var k = createLight(20,20,20,    .3, .3, .8,       30.0); 
	
	
	//Structures
	if (true){
	var numStruc = 5;
	var struc_t = [];
	var struc_x = [];
	var struc_y = [];
	var struc_z = [];
	var struc_s = [];
	for (var n = 0; n < numStruc; n++){
		var r = Math.floor( Math.random() * 3 );
		var type = "Cube";
		if (r == 0){ type = "Sphere"; }
		if (r == 1){ type = "Torus"; }
		if (r == 2){ type = "Cube"; }
		struc_t.push(type);
		struc_x.push( Math.random() * 50-10);
		struc_y.push( Math.random() * 7 + 3);
		struc_z.push( Math.random() * 50-10);
		struc_s.push( Math.random() * 1.5 + .5);
	}
	}

	
	
	var tick = function() {
		m.angle = animate(m.angle, m, tile, height);
		if (updateBackend == 2){
			updateBackend = 0;
			socket.onopen();
		}


		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers

		// Pass fog color, distances, and eye point to uniform variable
		eye[0] = m.px;
		eye[1] = m.py;
		eye[2] = m.pz;
		gl.uniform3fv(texProgram.u_FogColor, fogColor); // Colors
		gl.uniform2fv(texProgram.u_FogDist, fogDist);   // Starting point and end point
		gl.uniform4fv(texProgram.u_Eye, eye);           // Eye point
		gl.uniform4fv(texProgram.u_Eye2, eye);

		viewMatrix.setPerspective(90.0, canvas.width/canvas.height, 0.1, 200.0);
		projMatrix.setLookAt(m.px, m.py, m.pz ,   m.lx, m.ly, m.lz, 0.0, 1.0, 0.0);



		//Lights
		drawLights(gl, texProgram);
			
		//Floor
		if (true){

		gl.uniform1i(texProgram.u_Reflect, 3);
		
		var c = 0;
		for (var n = 0; n < 5; n++){
			for (var k = 0; k < 5; k++){
			
				if (tile[c] == "Geo" || tile[c] == 1){
					height[c] = 0;
				}
				if (tile[c] == "Tile" || tile[c] == 2){
					height[c] = -8;
				}
				if (tile[c] == "Wood" || tile[c] == 3){
					height[c] = 8;
				}

				var transformations = {};
				var translation = [0.0+n*8, -6-height[c]*1, 0.0+k*8];
				var scale = [8,8,8];
				var rotation =  [0.0,0.0,1.0,0.0];

				transformations.translation = translation;
				transformations.scale = scale;
				transformations.rotation = rotation;

				if (tile[c] == "Geo" || tile[c] == 1 || tile[c] == 3){
					drawTexObj(gl, texProgram, cube, geoMaterial, transformations, viewProjMatrix, geoNormal);
				}
				if (tile[c] == "Tile" || tile[c] == 2){
					drawTexObj(gl, texProgram, cube, tileMaterial, transformations, viewProjMatrix, tileNormal);
				}
				

				c += 1;
			}
		}
		
		gl.uniform1i(texProgram.u_Reflect, 0);
		
		}
		
		//Structures
		if (false){
		for (var c = 0; c < numStruc; c++){
			var transformations = {};
			var translation = [ struc_x[c], struc_y[c], struc_z[c] ];
			var scale = [8,8,8];
			var rotation =  [0.0,0.0,1.0,0.0];

			transformations.translation = translation;
			transformations.scale = scale;
			transformations.rotation = rotation;

			if (struc_t[c] == "Sphere"){
				gl.uniform1i(texProgram.u_Reflect, 1);
				
				translation = [ translation[0], translation[1] + Math.sin(m.angle*.05+c*.1)*1.5, translation[2] ];
				scale = [.3*struc_s[c],.3*struc_s[c],.3*struc_s[c]];
				
				transformations.scale = scale;
				transformations.translation = translation;
				
				drawTexObj(gl, texProgram, sphere, concreteMaterial, transformations, viewProjMatrix, blueMarbleNormal);
				gl.uniform1i(texProgram.u_Reflect, 0);
			}
			if (struc_t[c] == "Torus"){
			
				scale = [1.5*struc_s[c],1.5*struc_s[c],1.5*struc_s[c]];
				rotation =  [90.0+m.angle,0.0,1.0,0.0];
				
				transformations.scale = scale;
				transformations.rotation = rotation;

				drawTexObj(gl, texProgram, torus, torusMaterial, transformations, viewProjMatrix, torusNormalMap);
			}
			
			if (struc_t[c] == "Cube"){
			
				translation = [ translation[0], translation[1] + Math.sin(m.angle*.05+c*.1)*1.5, translation[2] ];
				scale = [2*struc_s[c],2*struc_s[c],2*struc_s[c]];
				
				transformations.scale = scale;
				transformations.translation = translation;

				drawTexObj(gl, texProgram, cube,  woodMaterial, transformations, viewProjMatrix, woodNormal);
			}
			
		}
		
		}

		//Brick Cube
		if (true){
		var transformations = {};
		var translation = [0.0, -1.0, 0.0];
		var scale = [1.1, 2.2, 1.1];
		var rotation =  [0.0,0.0,1.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		drawTexObj(gl, texProgram, cube, solidGray, transformations, viewProjMatrix, torusNormalMap);
		}
		
		//Land
		if (false){
		
		gl.uniform3f(texProgram.u_AmbientLight, 0.4,.4,.4);
		gl.uniform1i(texProgram.u_Special, 2);
		
		for (var n = 0; n < 1; n++){
			var transformations = {};
			var translation = [-14*n,-2,5];
			var scale = [1.5,1,1.5];
			var rotation =  [0 ,1.0,0.0,0.0];

			transformations.translation = translation;
			transformations.scale = scale;
			transformations.rotation = rotation;

			drawTexObj(gl, texProgram, land, grassMaterial, transformations, viewProjMatrix, plasterNormal);
		}	
		
		gl.uniform3f(texProgram.u_AmbientLight, 0.1,.1,.1);
		gl.uniform1i(texProgram.u_Special, 0);
		}

		//Sphere for Light
		if (true){
		var transformations = {};
		var translation = [ -0.4, 0.0, 2.0];
		var scale = [0.05, 0.05, 0.05];
		var rotation =  [0.0,0.0,1.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		drawTexObj(gl, texProgram, sphere, solidGray, transformations, viewProjMatrix, blueMarbleNormal);
		}

		//Sphere for Light
		if (true){
		var transformations = {};
		var translation = [0.4, 0.5, -2.3];
		var scale = [0.05, 0.05, 0.05];
		var rotation =  [0.0,0.0,1.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		drawTexObj(gl, texProgram, sphere, solidGray, transformations, viewProjMatrix, solidGrayNormal);
		}

		//Sphere Big
		if (true){
		gl.uniform1i(texProgram.u_Reflect, 1);
		
		var transformations = {};
		var translation = [0.0, -1.0, -3.5];
		var scale = [.4, .4, .4];
		var rotation =  [m.angle*.2,0.0,1.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		drawTexObj(gl, texProgram, sphere, concreteMaterial, transformations, viewProjMatrix, blueMarbleNormal);

		gl.uniform1i(texProgram.u_Reflect, 0);
		}

		//Sphere Medium Rotating
		if (true){
		gl.uniform1i(texProgram.u_Reflect, 1);
		
		var transformations = {};
		var translation = [Math.sin(m.angle/60)*5, -1.0, Math.cos(m.angle/60)*5];
		var scale = [.2, .2, .2];
		var rotation =  [0.0,1.0,0.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		drawTexObj(gl, texProgram, sphere, solidGray, transformations, viewProjMatrix, sphereNormalMap);

		gl.uniform1i(texProgram.u_Reflect, 0);
		}

		//Torus	
		if (true){
		var transformations = {};
		var translation = [-0.0,1.0,0];
		var scale = [1.0, 1.0, 1.0];
		var rotation =  [0.0,1.0,0.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		drawTexObj(gl, texProgram, torus, torusMaterial, transformations, viewProjMatrix, torusNormalMap);
		}

		//Enemy Objects
		if (true){
		gl.uniform1i(texProgram.u_Reflect, 2);
		
		for (var n = 0; n < Object.keys(id_s).length; n++){
			key = Object.keys(id_s)[n];
			ps_x[key] += delta_x[key];
			ps_y[key] += delta_y[key];
			ps_z[key] += delta_z[key];
			//console.log(ps_z[key]);
			var xx = ps_x[key];
			var yy = ps_y[key];
			var zz = ps_z[key];
			//console.log(ps_z[key]);
			//console.log(x + " " +y+" "+z);

			var transformations = {};
			var translation = [xx, yy-2, zz];
			var scale = [.4, .4, .4];
			var rotation =  [m.angle*.2,0.0,1.0,0.0];

			transformations.translation = translation;
			transformations.scale = scale;
			transformations.rotation = rotation;

			drawTexObj(gl, texProgram, sphere, concreteMaterial, transformations, viewProjMatrix, blueMarbleNormal);
		}

		gl.uniform1i(texProgram.u_Reflect, 0);
		}

		//Skybox
		if (true){
		var transformations = {};
		var translation = [m.px, m.py, m.pz];
		var scale = [25,25,25];
		var rotation =  [0.0,1.0,0.0,0.0];

		transformations.translation = translation;
		transformations.scale = scale;
		transformations.rotation = rotation;

		//is_Sky = 1;
		gl.uniform1i(texProgram.u_Special, 1);

		var scale = [20,21,21];
		if (m.day == 0){
			drawTexObj(gl, texProgram, skyBox, skyTex, transformations, viewProjMatrix, solidGrayNormal);
		}
		if (m.day == 1){
			drawTexObj(gl, texProgram, skyBox, skyTex2, transformations, viewProjMatrix, solidGrayNormal);
		}

		gl.uniform1i(texProgram.u_Special, 0);
		//is_Sky = 0;
		}


		//Toggle Post Effects on Canvas 2D
		if (true){

			mainCanvas.style.display = "block";
			postEffects.style.display = "none";
		
		}
		
		window.requestAnimationFrame(tick, canvas);
	}
	tick();
}

function doFunction(){
	pass;
}







//Sockets
socket = new WebSocket("ws://" + window.location.host + "/");
var my_id = Math.floor(Math.random() * (99))+1;
var my_id_str = String(my_id);
var ps_x = {};
var ps_y = {};
var ps_z = {};
var id_s = {};
var delta_x = {};
var delta_y = {};
var delta_z = {};
delta_x[my_id_str] = 0.0;
delta_y[my_id_str] = 0.0;
delta_z[my_id_str] = 0.0;
var dx = 0.0;
var dy = 0.0;
var dz = 0.0;
var tile = new Array(25);
var height = new Array(25);

socket.onopen = function() {

  console.log(dz);

  var data = {
    "id": my_id,
    "x": m.px, 
    "y": m.py, 
    "z": m.pz,
    "dx": dx,
    "dy": dy,
    "dz": dz,
  }

  socket.send(JSON.stringify(data));
}

socket.onmessage = function(e) {

  var data = JSON.parse(e.data);
  var id_new = encodeURI(data['id']);
  var mx = encodeURI(data['mx']);
  var my = encodeURI(data['my']);
  var mz = encodeURI(data['mz']);
  var mdx = encodeURI(data['dx']);
  var mdy = encodeURI(data['dy']);
  var mdz = encodeURI(data['dz']);

  id_str = String(id_new);
  id_s[id_str] = id_new;
  ps_x[id_str] = mx;
  ps_y[id_str] = my;
  ps_z[id_str] = mz;
  delta_x[id_str] = mdx;
  delta_y[id_str] = mdy;
  delta_z[id_str] = mdz;
  console.log(delta_z[id_str]);

  var board_temp = encodeURI(data['board']);
  var r = decodeURI(board_temp);
  var s = r.split(',');

  for(n = 0; n < s.length; n++){ //Save Board
      tile[n] = s[n];
      //height[n] = 0;
  }

}
if (socket.readyState == WebSocket.OPEN) socket.onopen();




/*
Create Model based on given model Data
*/
function initVertexBuffers(gl, myModel) {

    var vertices = new Float32Array(myModel.meshes[0].vertices);
    var texCoords = new Float32Array(myModel.meshes[0].texturecoords[0]);
    var normals = new Float32Array(myModel.meshes[0].normals);
    var tangents = new Float32Array(myModel.meshes[0].tangents);
    var bitangents = new Float32Array(myModel.meshes[0].bitangents);

    var indices = new Uint16Array([].concat.apply([], myModel.meshes[0].faces));

    var o = new Object(); // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    o.tangentBuffer = initArrayBufferForLaterUse(gl, tangents, 3, gl.FLOAT);
    o.bitangentBuffer = initArrayBufferForLaterUse(gl, bitangents, 3, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_SHORT);

    if (!o.vertexBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}




/*
Create Model based on given model Data - Cube
*/
function initCube(gl, myModel) {
	// Create a cube
	//    v6----- v5
	//   /|      /|
	//  v1------v0|
	//  | |     | |
	//  | |v7---|-|v4
	//  |/      |/
	//  v2------v3
	// Coordinates
    var vertices = new Float32Array(myModel.meshes[0].vertices);
	var vertices = new Float32Array([
		2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0,  // v0-v1-v2-v3 front
		2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0,  // v0-v3-v4-v5 right
		2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0,  // v0-v5-v6-v1 up
		-2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0, // v1-v6-v7-v2 left
		-2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0, // v7-v4-v3-v2 down
		2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0   // v4-v7-v6-v5 back
	]);
	
    var texCoords = new Float32Array(myModel.meshes[0].texturecoords[0]);
    var normals = new Float32Array(myModel.meshes[0].normals);
    var tangents = new Float32Array(myModel.meshes[0].tangents);
    var bitangents = new Float32Array(myModel.meshes[0].bitangents);

    //var indices = new Uint16Array([].concat.apply([], myModel.meshes[0].faces));  // Indices of the vertices
	var indices = new Uint16Array([
		0, 1, 2,   0, 2, 3,    // front
		4, 5, 6,   4, 6, 7,    // right
		8, 9,10,   8,10,11,    // up
		12,13,14,  12,14,15,    // left
		16,17,18,  16,18,19,    // down
		20,21,22,  20,22,23     // back
	]);

    texCoords = new Float32Array([   // Texture coordinates
       .5,  .75,   .25, .75,   .25,  .5,    .5,  .5,    // v0-v1-v2-v3 front
       .5,  .75,    .5,  .5,   .75,  .5,   .75, .75,    // v0-v3-v4-v5 right
       .5,  .75,    .5, 1.0,   .25, 1.0,   .25, .75,    // v0-v5-v6-v1 up
       .25, .75,   0.0, .75,   0.0,  .5,   .25,  .5,    // v1-v6-v7-v2 left
       .25, .25,   .5,  .25,   .5,   .5,   .25,  .5,    // v7-v4-v3-v2 down
       .75,  .5,   1.0,  .5,   1.0, .75,   .75, .75,    // v4-v7-v6-v5 back
    ]);

    var o = new Object(); // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    o.tangentBuffer = initArrayBufferForLaterUse(gl, tangents, 3, gl.FLOAT);
    o.bitangentBuffer = initArrayBufferForLaterUse(gl, bitangents, 3, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_SHORT);

    if (!o.vertexBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;

    o.numIndices = indices.length;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}




/**
 * initPlane - Initialize Plane arrays and buffers
 * @param {Object} gl - the WebGL rendering context
 * @param {Object} o - Holds cube object informations (Buffers and indices)
 */
function initPlane(gl, myModel){
  // v1-----v0
  //  |      |
  //  |      |
  // v2-----v3
  var v = [];
  var n = [];
  var t = [];
  var i = [];
  var tex = 1;
  var c = 0;
  for (var y = 0; y < 10; y++){
	for (var x = 0; x < 10; x++){
		v = v.concat([2+x*4, 0, 2+y*4,   -2+x*4, 0, 2+y*4,    -2+x*4, 0, -2+y*4,   2+x*4, 0, -2+y*4]);
		n = n.concat([0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0]); // v0-v1-v2-v3 front
		t = t.concat([tex, tex,    0.0, tex,     0.0, 0.0,   tex, 0.0]); // v0-v1-v2-v3 front
		i = i.concat([0+c*4,1+c*4,2+c*4,  0+c*4,2+c*4,3+c*4]);
		c += 1;
	}
  }
  
  var vertices = new Float32Array(
    v
  );
  var normals = new Float32Array(
	n
  );
  var texCoords = new Float32Array(
	t
  );

  var indices = new Uint16Array(i);
  
  var tangents = new Float32Array(myModel.meshes[0].tangents);
  var bitangents = new Float32Array(myModel.meshes[0].bitangents);

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
  o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
  o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
  o.tangentBuffer = initArrayBufferForLaterUse(gl, tangents, 3, gl.FLOAT);
  o.bitangentBuffer = initArrayBufferForLaterUse(gl, bitangents, 3, gl.FLOAT);
  
  o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_SHORT);
  o.numIndices = indices.length;
  
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  
  return o;

}









/*
@param gl - webgl context
@param program - the shader program that is used
@param imSrc - the image source
Attach the specified texture image to the specified shader program.
*/
function initTextures(gl, program, imSrc, texUnit) {
    var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the texture object');
        return null;
    }

    var image = new Image();  // Create a image object
    if (!image) {
        console.log('Failed to create the image object');
        return null;
    }
    // Register the event handler to be called when image loading is completed
    image.onload = function() {
        // Write the image data to texture object
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
        if(texUnit == 0){
            gl.activeTexture(gl.TEXTURE0);
        }
        else {
            gl.activeTexture(gl.TEXTURE1);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
		 
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); //CLAMP_TO_EDGE
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);		

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Pass the texure unit 0 to u_Sampler
        gl.useProgram(program);
        if(texUnit == 0){
            gl.uniform1i(program.u_Sampler, 0);
        }
        else{
            gl.uniform1i(program.normalMap, 1);
        }

        gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
    };

    // Tell the browser to load an Image
    image.src = imSrc;

    return texture;
}







/*
@param gl - WebGL context
@param program - the shader program
@param o - object that is being rendered
@param texture - the texture that will be used with our object.
@param transformations - the transformations that will be used for the cube
@param viewProjMatrix - Object that contains view matrix and projection matrix
the goal of drawTexObj is to place the specified texture onto the cube and
then call drawCube to render said cube.
*/

function drawTexObj(gl, program, o, texture, transformations, viewProjMatrix, normal) {
    gl.useProgram(program);   // Tell that this program object is used

    // Assign the buffer objects and enable the assignment
    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);  // Vertex coordinates
    initAttributeVariable(gl, program.a_Normal, o.normalBuffer);  // Vertex coordinates
    initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);// Texture coordinates
    initAttributeVariable(gl, program.a_Tangent, o.tangentBuffer);// Texture coordinates
    initAttributeVariable(gl, program.a_BiTangent, o.bitangentBuffer);// Texture coordinates
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer); // Bind indices

    // Bind texture object to texture unit 0
    gl.activeTexture(gl.TEXTURE0); //Diffuse texture applied
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.activeTexture(gl.TEXTURE1); //Normal map applied
    gl.bindTexture(gl.TEXTURE_2D, normal);
	
	gl.activeTexture(gl.TEXTURE2); //CubeTexture applied
	if (m.day == 0){
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, boxBright);
	}
	if (m.day == 1){
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, boxDay);
	}

    drawCube(gl, program, o, transformations, viewProjMatrix); // Draw
  
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}





/*
Create Light objects and push to stack
*/
lightVector = [];
numLights = 0;

function createLight(x, y, z,   r, g ,b,  i){
    let objLight = new LightObject(x, y, z, numLights, r, g, b,   i);
    lightVector.push(objLight);
    
    numLights++;
    
    return objLight.get_ID();
}


var which = 0;

function drawLights(gl, program){
    gl.useProgram(program);

    //Add a Light
    if (m.clight == 1){
      m.clight = 0;          
	  //if (which == 0){
		var k = createLight(m.px, m.py, m.pz,  0,.5,0,  10.0);
		/*which = 1;
	  }else{
		var k = createLight(m.px, m.py, m.pz,  .7,.7,.7,  10.0);
		which = 0;
	  }*/
    }

    //Pop off a Light
    if (m.clight == -1){
      m.clight = 0;
      if (numLights > 0){
        numLights-=1;
        lightVector.pop();
      }
      var n = numLights;
      program.u_LightActive = gl.getUniformLocation(program, "u_LightActive["+ n +"]");

      gl.uniform1i(program.u_LightActive, 0); 

    }
    
    //Cycle through the number of lights and set all according to what is stored in lightVector objects
    for (var n = 0; n < numLights; n++){
        var s = [0,0,0];
        var c = [0,0,0];
		var i = 0.0;
        for (var j = 0; j < 3; j ++){
          s[j] = lightVector[n].get_Pos()[j];
          c[j] = lightVector[n].get_Color()[j];
        }
		i = lightVector[n].get_Intensity();

        program.u_LightActive = gl.getUniformLocation(program, "u_LightActive["+ n +"]");
        program.u_LightColorArray = gl.getUniformLocation(program, "u_LightColorArray["+ n +"]");
        program.u_LightPositionArray = gl.getUniformLocation(program, "u_LightPositionArray["+ n +"]");
		program.u_LightIntensityArray = gl.getUniformLocation(program, "u_LightIntensityArray["+ n +"]");

        gl.uniform1i(program.u_LightActive, 1); 
        gl.uniform3f(program.u_LightColorArray, c[0], c[1], c[2]); 
        gl.uniform3f(program.u_LightPositionArray, s[0], s[1], s[2]); 
		gl.uniform1f(program.u_LightIntensityArray,  i); 
    }


    //Sunlight
    if (m.day == 0){ 
		gl.uniform3f(program.u_DiffuseLight, 0.3, 0.3, 0.17); //Sunset 
		gl.uniform3f(program.u_LightDirection, 1,1,1);
	}
	if (m.day == 1){
		gl.uniform3f(program.u_DiffuseLight, 0.3, 0.3, 0.3);
		gl.uniform3f(program.u_LightDirection, -1,1,1);
	}
    //gl.uniform3f(program.u_LightDirection, Math.cos(m.angle/30),1,Math.sin(m.angle/30));
	//gl.uniform3f(program.u_LightDirection, 1,1,1);

    //Ambient Light
    gl.uniform3f(program.u_AmbientLight, 0.1,.1,.1);
    
}



/*
@param gl - WebGL context
@param program - the shader program
@param o - object that is being rendered
@param transformations - the transformations that will be used for the cube
@param viewProjMatrix - Object that contains view matrix and projection matrix
Draw cube is used to render out the cube instance that we create.
*/
function drawCube(gl, program, o, transformations, viewProjMatrix) {

    //Calculate a model matrix
    g_modelMatrix.setTranslate(
        transformations.translation[0], 
        transformations.translation[1] + (transformations.translation[1]/2 + 1),
        transformations.translation[2]);
    g_modelMatrix.rotate(
        transformations.rotation[0], 
        transformations.rotation[1], 
        transformations.rotation[2], 
        transformations.rotation[3]);
    g_modelMatrix.translate(0, -1 * (transformations.translation[1]/2 + 1), 0);
    g_modelMatrix.scale(transformations.scale[0], transformations.scale[1], transformations.scale[2]);

    //transform normal based on model matrix
    normalMatrix.setInverseOf(g_modelMatrix);
    normalMatrix.transpose();

    //set the shader matrices values to our global ones
    gl.uniformMatrix4fv(program.u_ViewMatrix, false, viewProjMatrix.projMatrix.elements);
    gl.uniformMatrix4fv(program.u_ProjMatrix, false,  viewProjMatrix.viewMatrix.elements);
    gl.uniformMatrix4fv(program.u_ModelMatrix, false, g_modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);

    gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // DrawArray
	
}










function initArrayBufferForLaterUse(gl, data, num, type) {
    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write data into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Keep the information necessary to assign to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

 

function initElementArrayBufferForLaterUse(gl, data, type) {
    var buffer = gl.createBuffer();  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}












var oldx = 0.0;
var oldz = 0.0;
var oldlx = 0.0;
var oldlz = 0.0;
var preventx = false;
var preventz = false;
var onFloor = true;
var updateBackend = 0;

var g_last = Date.now();
function animate(angle, m, tile, height){
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    if (m.ro == 0x0){
        elapsed = 0;
    }
    var newAngle = angle + elapsed/50;
	
	//Collision
	var c = 0;
	var falling = true;
	onFloor = false;
	var speed = .125;
	var look = 0;

	//if (preventx == false){ oldx = m.px; oldlx = m.lx; }
	//if (preventz == false){ oldz = m.pz; oldlz = m.lz; }
	oldx = m.px; oldlx = m.lx;
	oldz = m.pz; oldlz = m.lz;
	
	//Player height change
	m.py -= m.jump;
	m.ly -= m.jump;

	var e = elapsed/10*speed;

	dx = 0.0;
	dy = 0.0;
	dz = 0.0;
  
    if (m.moveup >= 1){
        //if (preventx == false){ m.px = m.px + Math.cos(m.turn*3.14/180)*speed; }
        //if (preventz == false){ m.pz = m.pz + Math.sin(m.turn*3.14/180)*speed; }
        var ddx = Math.cos(m.turn*3.14/180)*e;
        var ddz = Math.sin(m.turn*3.14/180)*e;
		m.px = m.px + ddx;
		m.pz = m.pz + ddz;
        look = 1;
        dx += ddx; 
        dz += ddz; 
        //m.moveup-=1;
    }
    if (m.movedown >= 1){
        //if (preventx == false){ m.px = m.px - Math.cos(m.turn*3.14/180)*speed; }
        //if (preventz == false){ m.pz = m.pz - Math.sin(m.turn*3.14/180)*speed; }
		m.px = m.px - Math.cos(m.turn*3.14/180)*e;
		m.pz = m.pz - Math.sin(m.turn*3.14/180)*e;
        look = 1;
        //m.movedown-=1;
    }
  
    if (m.tright >= 1){
        //m.turn+=4;
        //if (preventx == false){ m.px = m.px + Math.cos((m.turn+90)*3.14/180)*speed; }
        //if (preventz == false){ m.pz = m.pz + Math.sin((m.turn+90)*3.14/180)*speed; }
		m.px = m.px + Math.cos((m.turn+90)*3.14/180)*e;
		m.pz = m.pz + Math.sin((m.turn+90)*3.14/180)*e;
        look = 1;
        //m.lx = m.px + Math.cos(m.turn*3.14/180);
        //m.lz = m.pz + Math.sin(m.turn*3.14/180);
        //m.tright-=1;
    }
    if (m.tleft >= 1){
        //m.turn-=4;
        //if (preventx == false){ m.px = m.px + Math.cos((m.turn-90)*3.14/180)*speed; }
        //if (preventz == false){ m.pz = m.pz + Math.sin((m.turn-90)*3.14/180)*speed; }
		m.px = m.px + Math.cos((m.turn-90)*3.14/180)*e; 
		m.pz = m.pz + Math.sin((m.turn-90)*3.14/180)*e;
        look = 1;	
        //m.tleft-=1;
    }
	
	preventx = false;
	preventz = false;
	
	for (var n = 0; n < 5; n++){
		for (var k = 0; k < 5; k++){
		
			if (tile[c] != " " && tile[c] != 0){
				var d = 8; //Distance of tiles
				var o = 4; //Offset (so position is top left of tiles, not middle)
				
				//X and Z coordinates
				if (m.px >= n*d-o-1 && m.px <= n*d+d-o+1 && m.pz >= k*d-o-1 && m.pz <= k*d+d-o+1){
					
					//Y coords (height)
					if (m.py < -height[c] && m.py >= -height[c]-m.jump){
						var cy = m.py + height[c];
						m.py = -height[c];
						m.ly -= cy;
						falling = false;
						onFloor = true;
						m.jump = 0.0;
					}
					if (m.py == -height[c]){ 
						//Allows jumping if on surface (same as above, but no m.jump = 0)
						var cy = m.py + height[c]; 
						m.py = -height[c];
						m.ly -= cy;
						falling = false;
						onFloor = true;
					}
					if (m.py < -height[c]-m.jump && m.py >= -height[c]-d-2){ 
						//underneath the 'surface'. Block on sides
						if ((m.px <= n*d-o || m.px >= n*d-o+d)){
							m.px = oldx;
						}
						else if (m.pz <= k*d-o || m.pz >= k*d-o+d){
							if (m.pz<=k*d-o){ m.pz = k*d-o-1;}
							if (m.pz>=k*d-o+d){ m.pz = k*d-o+d+1; }
						}
						
					}
					
				}
				
				//if ((m.px >= n*d-o-1 && m.px <= n*d+d-o+1) || (m.pz >= k*d-o-1 && m.pz <= k*d+d-o+1)){
				
				//}
				
			}
			c += 1;
		}
	}
	if (falling == true){ //Player is falling
		m.jump += .01;
		if (m.py < -30){
			m.py += 60;
			m.ly += 60;
		}
	}
	
	m.turn += x/5;
    //m.ly += y/10;
   	//Update looking direction
    if (x != 0 || y != 0 || look == 1){
        m.lx = m.px + Math.cos(m.turn*3.14/180);
        m.lz = m.pz + Math.sin(m.turn*3.14/180);
        m.ly -= y/150;
    }
	
    x = 0;
    y = 0;

    if (updateBackend == 1){
		updateBackend = 2;
	}

    return newAngle % (360*2);
}



function checkKey(e, m, type) {
    //console.log(e.keyCode);
    if (type == 5){
    	updateBackend = 1;
    	console.log("test");
    }

    e = e || window.event;
    if (e.keyCode == '67' && type == 5){ //c key
      m.clight = 1;
    }
    if (e.keyCode == '88' && type == 5){
      m.clight = -1;
    }
    if ((e.keyCode == '39' || e.keyCode == '68')) {  // right
      m.tright = type;
    }
    if ((e.keyCode == '37' || e.keyCode == '65')) { //left
      m.tleft = type;
    }
    if ((e.keyCode == '38' || e.keyCode == '87')) { //up
      m.moveup = type;
    }
    if ((e.keyCode == '40' || e.keyCode == '83')) { //down
      m.movedown = type;
    }
	
    if (e.keyCode == '32' && type == 5) { //space
      if (onFloor == true){
        m.jump -= .4;
   	  }
    }
	
	if (e.keyCode == '70' && type == 0){
	  m.day = 1 - m.day;
	}
    
    if (e.keyCode == '82'){ //r
      m.ro = m.ro + 1;
            
      if (m.ro > 0x03){ m.ro = 0x0; }
      pointLight1 = m.ro & 0x01; 
      pointLight2 = m.ro & 0x02;
     
    }
    
}

