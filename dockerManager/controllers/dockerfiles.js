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
	        // 	console.log("progress: " + parseInt(progress, 10) + "%\n");
	        res.write("progress: " + parseInt(progress, 10) + "%\n");

	    });

	    req.on('end', function () {

	    	buildDockerfile(newFilePath);

	    	res.redirect('/dashboard');
	       // res.end("file uploaded");

	    })

	});// end 'fs.exists'




};


buildDockerfile = function(fielPath){
	console.log( "Building file: " +  fielPath);

}



exports.progressStatus = function (req, res) {

    res.send("progress: " + parseInt(progress, 10) + "%\n");
}