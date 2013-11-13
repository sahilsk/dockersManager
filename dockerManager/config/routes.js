
var controllers = require('../controllers');
var dockerfile = require("../controllers/dockerfiles");
var docker = require("../controllers/docker");
var container = require("../controllers/container");

exports.makeRoutes= function(app){

	

	/*
	||Entrypoint
	||
	*/

	app.get('/', controllers.index);



	/*
	||Dockerfile Upload Operations
	||
	*/
	app.post("/upload", dockerfile.upload);

	app.get("/progressStatus", dockerfile.progressStatus);

	app.get("/dashboard/:docfileName", function(req, res){
		res.redirect("/dockers/" + req.params.docfileName );

	});


	

	/*
	||Docker Operations
	||
	*/

	app.get("/dockers", function(req, res){
		req.session.messages = {text: "Please upload dockerfile first", type: "warn"};
	    res.redirect("/"); 

	})

	app.get("/dockers/list", docker.list);

	app.get("/dockers/:id", docker.index);
	app.get("/dockers/:id/inspect", docker.inspect);
	app.get("/dockers/:id/delete", docker.delete);
	app.get("/dockers/:id/containers", docker.containers);
//	app.delete("/dockers/:id/delete", docker.delete)



	/*
	||Containers Operations
	||
	*/
	app.get("/containers/:id/inspect", container.inspect);
	
	app.get("/containers", container.index);
	app.get("/containers/list", container.list);

	app.get("/containers/:id/toggle", container.toggleStatus);

	app.get("/containers/:id/kill", container.kill)
	app.get("/containers/:id/delete", container.delete);






} 