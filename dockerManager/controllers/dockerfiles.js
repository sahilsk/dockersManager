var fs = require("fs");
var path = require('path');


var progress  = 0;
/*
	Upload Dockerfile
*/
exports.upload = function(req, res){

 var newFile = fs.createWriteStream(  path.join( __dirname, "uploads/dockerfile_copy") );
 req.pipe(newFile);

 var fileBytes = req.headers['content-length'];
 var uploadedBytes = 0;

  req.on('data', function(data){
  	uploadedBytes += data.length;
  	 progress = uploadedBytes/fileBytes* 100;
 // 	console.log("progress: " + parseInt(progress, 10) + "%\n");
  	res.write("progress: " + parseInt(progress, 10) + "%\n");

  });

  req.on('end', function(){
  	res.end("file uploaded");

  })

};


exports.progressStatus = function(req, res){

		res.send("progress: " + parseInt(progress, 10) + "%\n");
}