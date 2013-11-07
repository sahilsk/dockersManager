
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


	app.get("/docker/:docfileName", docker.index);

	app.get("/docker/:image/containers/list", docker.containers);

	


} 