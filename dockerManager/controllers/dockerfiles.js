var fs = require("fs");
var path = require('path');


var progress = 0;
/*
	Upload Dockerfile
*/
exports.upload = function (req, res) {

	var newFilePath =  path.join( __dirname, "../uploads");
	var newFileName = "dockerfile_copy";


	fs.exists(newFilePath, function (exists) {
  		if(!exists){
  			console.log("File path doesn't exist");
  			res.end("Path doesn't exist: <" + newFilePath + ">");
  			return;
  		}

	    var newFile = fs.createWriteStream( path.join( newFilePath, newFileName) );
	    req.pipe(newFile);

	    var fileBytes = req.headers['content-length'];
	    var uploadedBytes = 0;

	    req.on('data', function (data) {
	        uploadedBytes += data.length;
	        progress = uploadedBytes / fileBytes * 100;
	        console.log("progress: " + parseInt(progress, 10) + "%\n");
	        res.write("progress: " + parseInt(progress, 10) + "%\n");

	    });

		var buildName = "";
	    req.on('end', function () {
	    	buildName =  req.body.build_name

	    	console.log("Building dockfile with name : " + buildName);
	    	buildDockerfile(newFilePath);

	    	res.end("done");

	    });


	});// end 'fs.exists'

};


buildDockerfile = function(fielPath){
	console.log( "Building file: " +  fielPath);
	return 0;
}


exports.progressStatus = function (req, res) {

    res.send("progress: " + parseInt(progress, 10) + "%\n");
}