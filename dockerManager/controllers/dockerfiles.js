/*
||Dockerfiles.js
||Description:   Contain functions speicific to operations on Dockerfile.
||				->upload() : upload dockerfile
||				->buildDockerfile() : Build dockerfile and create image
||				->progressStatus() : function to track file uploading progress status 
*/		



var fs = require("fs");
var path = require('path');




var progress = 0;

/*
||	upload(req, res) 
|| 	Description:  Upload dockerfile and build it
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

	    req.on('end', function () {
	    	var buildName =  req.body.build_name

	    	console.log("Building dockfile with name : " + buildName);
	    	
	    	//if build susccess redirect to dashboard 
	    	if(  	buildDockerfile(newFilePath, buildName) ){

	    		req.session.messages = {text: "Dockerfile (" + buildName + ") built successfully.", type: "alert"};
	   			res.redirect("/docker/" + buildName); 

	    	}else{
	    	// Redirect to upload page showing error in building file
	    		req.session.messages = {text: "Error while building dockerfile", type: "error"};
	   			res.redirect("/"); 

	    	}

	    	//res.end("done");

	    });

	    


	});// end 'fs.exists'

};


/*
||	buildDockerfile(filepath, buildname) 
|| 	Description:  build dockerfile (filePath) and built it with tag 'buildName'
*/

 function buildDockerfile(filePath, buildName){
	console.log( "Building file( "+ buildName + "): " +  filePath);
	return false;
}



/*
||	progressStatus() 
|| 	Description:  function to track file uploading progress status 
	ToDo
*/

exports.progressStatus = function (req, res) {

    res.send("progress: " + parseInt(progress, 10) + "%\n");
}