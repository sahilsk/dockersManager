exports.index = function(req, res){

	if( req.params.docfileName.length ===0){
		res.redirect("/");
		return;
	}
		res.render("docker/index", {title:"Dashboard", 
			dockerfile_name  : req.params.docfileName });

}

exports.list =function(req, res){

	res.send("list dockers");

}

exports.containers =function(req, res){

	res.send("list dockers containers");

}




