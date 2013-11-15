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


	rdsClient.lrange( "hosts", 0, -1, function(err, hostsList){
		hostsList.forEach( function(host){
			console.log(JSON.parse(host));
			
		});

		res.end( "exporting json");

	});

}

exports.add =  function( req, res){

	rdsClient.incr("global:nextHostId", function(err, incrId){
		if( !err){
			var newHost = { id: incrId, ip: "12.233.34."+incrId, port:8343, name :"agni_"+incrId };

			rdsClient.lpush( "hosts", JSON.stringify( newHost), 0, -1, function(err, reply){
				res.end( "successfully saved " + JSON.stringify( newHost) );
			});

		}

	});

}



