/*
||docker.js
||Description:   Contain functions to operate image and containers using dockers remote api's
||				->index() : entery file
||				->list() : lsit all containers 
||				->progressStatus() : function to track file uploading progress status 
*/		


exports.index = function(req, res){

	res.render("docker/index", {title:"Dashboard", 
			dockerfile_name  : req.params.docfileName });

}


exports.inspect = function(req, res){

	res.render("docker/inspect", {title:"Dashboard", 
			dockerfile_name  : req.params.docfileName });

}





exports.list =function(req, res){

	res.send("list dockers");

}


exports.containers =function(req, res){

	res.send("list dockers containers");

}




