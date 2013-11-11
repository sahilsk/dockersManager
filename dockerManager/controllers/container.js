/*
||docker.js
||Description:   Contain functions to operate on containers  using dockers remote api's
||				->index() : entery file
||				->list() : lsit all containers 
||				->progressStatus() : function to track file uploading progress status 
*/		


var appUtil = require("./app_util");


exports.index = function(req, res){

	res.render("docker/index", {title:"Dashboard", 
			dockerfile_name  : req.params.docfileName });

}


exports.inspect = function(req, res){

	//makeGetRequest("/containers/json?all=1" , function(data){
	  appUtil.makeGetRequest("/containers/"+ req.params.id +"/json", function(data,statusCode){
		switch( statusCode){

			case 200:
				viewData = JSON.parse(data);
				break;
			case 404:
				viewData =  "No such container : " + req.params.id;
				break;
			case 500:
				viewData = "Server Error";
				break;
			default:
				console.log("Unable to query list of containers");
				req.session.messages = {text: "Unable to query list of containers. Please check your network connection.", type: "error"};
				res.redirect("docker/" + req.params.id);
				res.end();
		}


		console.log( viewData);


		res.render("container/inspect", {
			title:"Inspect Container", 
			id  : req.params.id, 
			"data":viewData,
			statusCode : statusCode
		 });

	}); 

}

exports.list =function(req, res){

	appUtil.makeGetRequest("/containers/json?all=1" , function(data,statusCode){

		switch( statusCode){

			case 200:
				viewData = JSON.parse(data);
				break;
			case 404:
				viewData =  "No such container : " + req.params.id;
				break;
			case 500:
				viewData = "Server Error";
				break;
			default:
				console.log("Unable to query list of containers");
				req.session.messages = {text: "Unable to query list of containers. Please check your network connection.", type: "error"};
				res.redirect("docker/" + req.params.id);
				res.end();
		}


		console.log( viewData);


		res.render("docker/inspect", {
			title:"Inspect Docker Image", 
			id  : req.params.id, 
			"data":viewData,
			statusCode : statusCode
		 });



	}); 

}


exports.containers =function(req, res){

	res.send("list dockers containers");

}






