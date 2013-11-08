
var controllers = require('../controllers');
var user = require('../controllers/user');
var dockerfile = require("../controllers/dockerfiles");
var docker = require("../controllers/docker");

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

	app.get("/docker/:docfileName", docker.index);
	app.get("/docker/:docfileName/inspect", docker.inspect);


	/*
	||Containers Operations
	||
	*/
	app.get("/docker/:image/containers/list", docker.containers);

	




} 