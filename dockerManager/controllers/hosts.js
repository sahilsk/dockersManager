/*
||hosts.js
||Description:   Contain functions to add, remove or edit dockers host list
||				->index() : entery file . By default it set to list all servers. (redirect @list)
||				->list() : list all servers 
||				->add() :  Add new server
||				->remove() :  remove existing server
||				->edit() :  edit existing server

*/


var config = require('../config/config');


var redis = require("redis");
var rdsClient = redis.createClient( config.redis.port, config.redis.hostname);

exports.index = function( req, res){
	res.redirect("/hosts/list");

}


exports.list =  function( req, res){

	var jHostList = [];
	rdsClient.lrange( "hosts", 0, -1, function(err, hostsList){
		hostsList.forEach( function(host){
			console.log(JSON.parse(host));
			if( JSON.parse(host).id !== "undefined" ){
				jHostList.push( JSON.parse(host));
			}
			
		});

		res.render("host/index", {title:"Hosts List", hostList: jHostList, page: "hosts_list"});

	});

}



exports.new = function(req, res){
	res.render("host/new", { title: "Add new host"});
}


exports.add =  function( req, res){

	var host ={
		name: req.body.hostname,
		ip: req.body.ip,
		port:req.body.port
	}

	rdsClient.incr("global:nextHostId", function(err, incrId){
		if( !err){
			var newHost = { id: incrId, ip: host.ip, port: host.port, name : host.name };

			rdsClient.lpush( "hosts", JSON.stringify( newHost), 0, -1, function(err, reply){
				if(!err){

					 req.session.messages = {
				        text: 'New Host Added successfully',
				        type: 'alert'
				     };
					
				}else{
			      req.session.messages = {
			        text: 'Unable to create new host. Cause:  <' + err + '>',
			        type: 'error'
			      };
				}
				res.redirect("/hosts/list");
				
			});

		}

	});
}

exports.delete = function(req, res){
	console.log("Id to delete: " , req.params.id);
	var id = req.params.id;

	rdsClient.lrange("hosts", 0, -1, function(err, hostsList){
		var recValue = "";

		if(!err){
			hostsList.forEach(  function(host){
				jHost = JSON.parse(host);
				if( typeof jHost.id != "undefined" && jHost.id == id){
					console.log("Host Found");
					recValue = host;
				}

			}); // end 'forEach'


			if( recValue.length === 0){
				
				req.session.messages = {
					text: "No such record found ",
					type: 'warn'
				};	
			
				res.redirect("/hosts/list");
				return true;
			}

			console.log("Value found. Deleting...");

			rdsClient.lrem("hosts", 1, recValue, function(err, reply){
				if( !err){
					console.log( "record deleted successfully!! : Records Deleted: " + reply);
					req.session.messages = {
						text:  "record deleted successfully!!",
						type: 'alert'
					};


				}else{
					console.log("Error deleting: ", err);
					req.session.messages = {
						text: "Error deleting host entry. Cause: " + err,
						type: 'error'
					};						
				}
				res.redirect("/hosts/list");


			});

		}
	});
}

exports.edit = function(req, res){
	res.send("edit here" + req.params.id);
}

exports.update = function(req, res){
	res.send("update here" +  req.params.id);

}




