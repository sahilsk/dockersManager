
var controllers = require('../controllers');
var dockerfile = require("../controllers/dockerfiles");
var docker = require("../controllers/docker");
var container = require("../controllers/container");
var host = require("../controllers/hosts");

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
	app.post("/upload", dockerfile.uploadToAll);

	app.get("/dashboard/:docfileName", function(req, res){
		res.redirect("/dockers/" + req.params.docfileName );

	});
	app.get("/dockerfiles", dockerfile.list);
	app.get("/dockerfiles/list", dockerfile.list);
	app.get("/dockerfiles/:recordID/push", dockerfile.push);
	app.get("/dockerfiles/:recordID/delete", dockerfile.delete);

	app.get("/dockerfiles/:buildTag", dockerfile.show);




	

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
	app.get("/containers/new", container.new);
//	app.post("/containers/create", container.create);
	app.post("/containers/create", container.createInAll);
	app.get("/containers/:id/kill", container.kill)
	app.get("/containers/:id/delete", container.delete);



	/*
	||	Hosts Operation
	||
	*/

	app.get("/hosts", host.index);
	app.get("/hosts/list", host.list);
	app.get("/hosts/new", host.new);
	app.post("/hosts/create", host.add)
	app.get("/hosts/:id/delete", host.delete);
	app.get("/hosts/:id/edit", host.edit);
	app.post("/hosts/:id/update", host.update);
	app.get("/hosts/getServerStatus", host.serverStatus);


} 