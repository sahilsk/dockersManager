
var controllers = require('../controllers');
var user = require('../controllers/user');
var dockerfile = require("../controllers/dockerfiles");
var docker = require("../controllers/docker");
var container = require("../controllers/container");

exports.makeRoutes= function(app){


	app.get('/', controllers.index);

	app.get('/users', user.list);

	app.post("/upload", dockerfile.upload);

	app.get("/progressStatus", dockerfile.progressStatus);


	app.get("/dashboard/:docfileName", function(req, res){
		res.redirect("/docker/" + req.params.docfileName );

	});


	app.get("/docker", function(req, res){
		req.session.messages = {text: "Please upload dockerfile first", type: "warn"};
	    res.redirect("/"); 

	  })

	

	/*
	||Docker Operations
	||
	*/

	app.get("/docker/:id", docker.index);
	app.get("/docker/:id/inspect", docker.inspect);


	/*
	||Containers Operations
	||
	*/
	app.get("/containers/:id/inspect", container.inspect);
	app.get("/containers/list", container.list);


	




} 