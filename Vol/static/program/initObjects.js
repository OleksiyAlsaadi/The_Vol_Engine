/*
  LoadModels uses the function loadJsonresource to load a models
  vertex, normal, tangent, bitangent, and uv information from a json
  file.

  I used a command line program called, "Assimp" that converts obj files to JSON.
  From there I followed along with this tutorial,
  https://www.youtube.com/watch?v=sM9n73-HiNA which goes over how to load
  the generated JSON file from assimp.

  Link to the library for Assimp2JSON: https://github.com/acgessler/assimp2json
*/


var myCube;
var mySphere;
var myTorus;


function loadModels(){
	    
		  
		  
  loadJSONResource('./static/program/Primitives/myCube.json', function(modelErr3, modelObj3){
	if(modelErr3){
	  alert("Failed to load cube.");
	}else{
	  myCube = modelObj3;
			
  loadJSONResource('./static/program/Primitives/myTorus.json', function(modelErr4, modelObj4){
	if(modelErr4){
	  alert("Failed to load torus.");
	}else{
	  myTorus = modelObj4;
				  
  loadJSONResource('./static/program/Primitives/mySphere.json', function(modelErr5, modelObj5){
	if(modelErr5){
	  alert("Failed to load sphere.");
	}
	else{
	  mySphere = modelObj5;
		main();
	  }
  });
  
	}
  });
			
	}
  });	  
  
  
}

