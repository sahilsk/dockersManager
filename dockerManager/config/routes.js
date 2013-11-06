
var controllers = require('../controllers');
var user = require('../controllers/user');
var dockerfile = require("../controllers/dockerfiles");

exports.makeRoutes= function(app){


	app.get('/', controllers.index);

	app.get('/users', user.list);

	app.post("/upload", dockerfile.upload);


	app.get("/progressStatus", dockerfile.progressStatus)


} 