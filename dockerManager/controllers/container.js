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

	appUtil.makeGetRequest("/containers/json?all=1&size=1" , function(data,statusCode, errorMessage){

		switch( statusCode){

			case 200:
				viewData = JSON.parse(data);
				break;
			case 400:
				viewData =  "Bad Parameters ";
				break;
			case 500:
				viewData = "Server Error : " + errorMessage;
				break;
			default:
				req.session.messages = {text: "Unable to query list of containers. Please check your network connection. : <" + errorMessage+ 
				">", type: "error"};
				viewData = "Unable to communicate";
		}



		res.render("container/list", {
			title:"Inspect Docker Image", 
			id  : req.params.id, 
			"data":viewData,
			statusCode : statusCode
		 });



	}); 

}


exports.index =function(req, res){

	res.redirect("/containers/list");

}

exports.toggleStatus = function(req, res){

	isContainerRunning( req.params.id, function(running){

		var taskToPerform = running ? "stop" : "start";
		console.log(  running? "Stopping container..." : "Starting container...");

		appUtil.makePostRequest("/containers/" + req.params.id + "/"+ taskToPerform , function( result, statusCode, error){

			
				switch( statusCode){

					case 404:
						req.session.messages = {text: "No such container : '"+ req.params.id + "' ", type: "error"};
						break;
					case 204:
						req.session.messages = {text: "'"+ req.params.id + "' container " + (running? "stopped": "started") +  " successfully. ", type: "alert"};
						break;

					case 500:
						req.session.messages = {text: "Server Error. Cause: " + result, type: "error"};
						break;					

					default:
						req.session.messages = {text: "Unable to query list of containers. Please check your network connection. : <" + errorMessage+ 
						">", type: "error"};
										
				}


				res.redirect("/containers/list");
				res.end();


		});


	}); //  end 'isContainerRunning'


	



}



exports.kill = function(req, res){


	appUtil.makePostRequest("/containers/" + req.params.id + "/kill" , function( result, statusCode, error){

		
			switch( statusCode){

				case 404:
					req.session.messages = {text: "No such container : '"+ req.params.id + "' ", type: "error"};
					break;
				case 204:
					req.session.messages = {text: "'"+ req.params.id + "' container killed successfully.", type: "alert"};
					break;

				case 500:
					req.session.messages = {text: "Server Error.", type: "error"};
					break;					

				default:
					req.session.messages = {text: "'"+ req.params.id + "' container killed successfully.", type: "alert"};
					
			}


			res.redirect("/containers/list");
			res.end();


	});

}


exports.delete = function(req, res){


	appUtil.makeDELETERequest("/containers/" + req.params.id, function( result, statusCode, errorMessage){

			
			switch( statusCode){

				case 409:
					req.session.messages = {text: "Conflict in removing container : '"+ req.params.id + "' ", type: "error"};
					break;				

				case 404:
					req.session.messages = {text: "No such container : '"+ req.params.id + "' ", type: "error"};
					break;
				case 204:
					req.session.messages = {text: "'"+ req.params.id + "' container removed successfully.", type: "alert"};
					break;

				case 500:
					req.session.messages = {text: "Server Error.", type: "error"};
					break;					

				default:
					req.session.messages = {text: "Unable to query docker container. Please check your internet connection. <"+ errorMessage + ">", type: "error"};

			}

			res.redirect("/containers/list");
			res.end();


	});

}




function isContainerRunning( containerID, onResult){

	var running = false;

	appUtil.makeGetRequest("/containers/"+ containerID +"/json", function(data, statusCode){
		if( statusCode === 200){
			running = JSON.parse(data).State.Running;		
		}
		onResult( running);
	});

}


