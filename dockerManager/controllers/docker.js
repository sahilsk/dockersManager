/*
||docker.js
||Description:   Contain functions to operate image  using dockers remote api's
||				->index() : entery file
||				->list() : lsit all containers 
||				->progressStatus() : function to track file uploading progress status 
*/		


var appUtil = require("./app_util");


exports.index = function(req, res){

	res.render("docker/index", {
			title:"Dashboard", 
			id  : req.params.id });

}


exports.inspect = function(req, res){

	  appUtil.makeGetRequest("/images/"+ req.params.id +"/json", function(data,status){
		if( data){
			if( status ===404){
				//res.end("no such image: " + req.params.id);
				jsonData = { "No such image" : req.params.id};
				//return;
			}else{
				jsonData = JSON.parse( data);
			}
			res.render("docker/inspect", {
				title:"Inspect Docker Image", 
				id  : req.params.id, 
				"data":jsonData,
				statusCode : status
			 });

		}else{
			req.session.messages = {text: "Unable to query docker image.", type: "error"};
			alertMessage = "Unable to query docker image. Please check your internet connection" ;
			
			/*
			jsonData = [
					{
						"Name": "name goes here", 
						"id" : "3443434343434",
						 "built on": "2/23/3422"
					 }
					];
			*/

			res.render("docker/inspect", {
				title:"Inspect Docker Image", 
				id  : req.params.id, 
				"data":alertMessage,
				statusCode : status,
				messages : req.session.messages
			 });

		}
	}); 
}



exports.list =function(req, res){

	res.send("list dockers");

}


exports.delete = function(req, res){
	req.session.messages = {text: "'"+ req.params.id + "' image deleted successfully.", type: "alert"};
	res.redirect("/");
}


exports.containers =function(req, res){

	res.send("list dockers containers");

}






