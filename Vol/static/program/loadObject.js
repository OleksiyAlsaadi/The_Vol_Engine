/*
  These functions were provided from @IndigoCode on YouTube.
  URL: https://www.youtube.com/watch?v=sM9n73-HiNA
  File-URL: https://github.com/sessamekesh/IndigoCS-webgl-tutorials/blob/8194fa6fbfb44abac0cef9aaa96f906b8a34c9ef/util.js

  This is used to load object information from a JSON file format.
*/

// Load a text resource from a file over the network
var loadTextResource = function (url, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', url + '?please-dont-cache=' + Math.random(), true);
	request.onload = function () {
		if (request.status < 200 || request.status > 299) {
			callback('Error: HTTP Status ' + request.status + ' on resource ' + url);
		} else {
			callback(null, request.responseText);
		}
	};
	request.send();
};

var loadImage = function (url, callback) {
	var image = new Image();
	image.onload = function () {
		callback(null, image);
	};
	image.src = url;
};

var loadJSONResource = function (url, callback) {
	loadTextResource(url, function (err, result) {
		if (err) {
			callback(err);
		} else {
			try {
				callback(null, JSON.parse(result));
			} catch (e) {
				callback(e);
			}
		}
	});
};


function loadTextResourcee(url){
	var request = new XMLHttpRequest();
	request.open('GET', url + '?please-dont-cache=' + Math.random(), true);
	request.onload = function () {
		if (request.status < 200 || request.status > 299) {
			callback('Error: HTTP Status ' + request.status + ' on resource ' + url);
		} else {
			JSON.parse(request.responseText);
		}
	};
	request.send();
}
