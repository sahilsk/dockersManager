exports.index = function(req, res){

	if( req.params.docfileName.length ===0){

		res.redirect("/");
		return;
	}
		res.render("docker/index", {title:"Dashboard", 
			dockerfile_name  : req.params.docfileName });

}


