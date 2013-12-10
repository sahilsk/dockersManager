/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var logger = require("./config/logger.js");

var Primus = require('primus.io');
var resource = require('primus-resource');


var rdsClient = require('./config/database');

var streamController = require("./controllers/streamController.js")




var server;

var routes = require('./config/routes.js');
var app = express();
app.use(express.bodyParser({
  keepExtensions: true,
  uploadDir: 'uploads'
}));
//app.use(require('connect').bodyParser());
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(function (req, res, next) {
  res.locals.messages = req.session.messages;
  delete req.session.messages;
  next();
});
app.use(app.router);
app.use(express.csrf());
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));



logger.info("init...");

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
routes.makeRoutes(app);


server = http.createServer(app); 

server.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

var primus = new Primus( server, { transformer : 'websockets', parse: 'JSON'} );

primus.use('resource', resource);

var Dockerfile =  primus.resource('Dockerfile');

Dockerfile.onupload = streamController.upload;







var util = require('util')
  , Files = {},
   fs = require('fs'),
   async = require('async'),
   config = require("./config/config.js"),
   appUtil = require("./controllers/app_util.js");

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}


primus.on('connection', function(client){
//io.sockets.on('connection', function(client){

      console.log("client connected");
  //    client.set('user', client.id);
      client.send('identifier', client.id );

      client.send('messages', true);
      primus.write("New Client connected: " + client.id );

	  client.on('Start', function (data) { //data contains the variables that we passed through in the html file
	  		console.log("start triggered");
			var buildName = data['buildName'];
			Files[buildName] = {  //Create a new Entry in The Files Variable
				FileSize : data['Size'],
				Data	 : "",
				Downloaded : 0
			}
			var Place = 0;
			try{
				var Stat = fs.statSync('uploads/temp/' +  buildName);
				if(Stat.isFile())
				{
					Files[buildName]['Downloaded'] = Stat.size;
					Place = Stat.size / 524288;
				}
			}
	  		catch(er){
	  			console.log("Error: ", er);
	  			client.send("build error",  JSON.stringify(er) ) ;
	  		} //It's a New File

			fs.open("uploads/temp/" + buildName, 'a', 0755, function(err, fd){
				if(err)
				{
					console.log(err);
				}
				else
				{
					Files[buildName]['Handler'] = fd; //We store the file handler so we can write to it later
					client.send('MoreData', { 'Place' : Place, Percent : 0 });
				}
			});
		});
	
	  client.on('Upload', function (data){
			var buildName = data['buildName'];
			Files[buildName]['Downloaded'] += data['Data'].length;
			Files[buildName]['Data'] += data['Data'];
			var buildName =  data['buildName'];
			if(Files[buildName]['Downloaded'] == Files[buildName]['FileSize']) //If File is Fully Uploaded
			{
				fs.write(Files[buildName]['Handler'], Files[buildName]['Data'], null, 'Binary', function(err, Writen){
					var inp = fs.createReadStream("uploads/temp/" + buildName);
					var newFileName = buildName + "_" + (+new Date );

					var out = fs.createWriteStream("uploads/" + newFileName);
					inp.pipe(out);
					inp.on("end",  function(){
						fs.unlink("uploads/temp/" + buildName, function () { //This Deletes The Temporary File
							console.log("file moved");
							client.send('Done', {'Dockerfile' : 'uploads/' + buildName });
							client.send('build start', "Starting building...");
							buildDockerfile(buildName, "uploads/" + newFileName);


						});
					});
				});
			}
			else if(Files[buildName]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
				fs.write(Files[buildName]['Handler'], Files[buildName]['Data'], null, 'Binary', function(err, Writen){
					Files[buildName]['Data'] = ""; //Reset The Buffer
					var Place = Files[buildName]['Downloaded'] / 524288;
					var Percent = (Files[buildName]['Downloaded'] / Files[buildName]['FileSize']) * 100;
					client.send('MoreData', { 'Place' : Place, 'Percent' :  Percent});
				});
			}
			else
			{
				var Place = Files[buildName]['Downloaded'] / 524288;
				var Percent = (Files[buildName]['Downloaded'] / Files[buildName]['FileSize']) * 100;
				client.send('MoreData', { 'Place' : Place, 'Percent' :  Percent});
			}

		});

	

	function buildDockerfile( buildTagName ,filePath){


	  var newFilePath = filePath; //path.join(__dirname, '../uploads');
	//  var buildTagName = "ajax_upload_test_001"; //require('querystring').escape(req.body.build_name);
	  var remoteBuildTagName = encodeURIComponent(config.repository.development.hostname + ':' + config.repository.development.port + '/' + buildTagName);
	  var tarFileUploadedPath = filePath;

	  client.send("build progress", 'file path' + tarFileUploadedPath);
	  client.send("build progress",'build name'+ buildTagName);
	  client.send("build progress", "tag name: " + remoteBuildTagName);

	  if (buildTagName.length == 0) {
	  	client.send("build error", 'Please provide tag name to build image');
	    return;
	  }


	  var buildServer;
	  var builtImageID = null;
	  var repository = config.repository.development;
	  //util.format("%s:%s", config.repository.development.hostname, config.repository.development.port);
	  async.series([
	     function (callback) {
	     	buildServer = config.build_server;

	        appUtil.isDockerServerAlive(buildServer.hostname, buildServer.dockerPort, function (isAlive, errorMessage) {
	          logger.info('===========================Alive : ' + isAlive);
	          if( !isAlive)
	          	callback(  util.format("Build Server[%s:%s] not alive.", buildServer.hostname, buildServer.dockerPort) );
	           else
	           	callback();
	        });

	    },
	    function (callback) {
	      /*
	      || Dispatch build request
	          |-> Build on one dockerhost
	          |-> Send pull request to all other livehosts
	      ||
	      */
          client.send("build progress", "build server : " + JSON.stringify(buildServer) );
	      
		  var resBody = '';
		  var queryString =  '/build?t=' + remoteBuildTagName;
		  var options = {
		      hostname: buildServer.hostname,
		      port: buildServer.dockerPort,
		      path: queryString,
		      method: 'POST'
		    };
		  client.send( "build progress", 'Building dockerfile on ' + JSON.stringify(options));
		  var req = http.request(options, function (res) {

		      console.log('STATUS: ' + res.statusCode);
		      console.log('HEADERS: ' + JSON.stringify(res.headers));
		    
		      client.send("build progress", 'STATUS: ' + res.statusCode);

		      res.setEncoding('utf8');
		      res.on('data', function (chunk) {
		        resBody += chunk;
		        client.send("build progress",chunk);
		        logger.info(chunk);
		      });
		      res.on('end', function () {
		     		client.send("build end", "-------------------- END -------------------");
				    if (res.statusCode === 200) {
				      if (resBody.toString().indexOf('Successfully built') != -1) {
				        logger.info(resBody.split('Successfully built'));
				        builtImageID = resBody.split('Successfully built')[1].trim();
				        client.send("build progress", "Build Image Id: " + builtImageID );
				      }
				    }else
				    	client.send("build error", "Error building image: " + resBody );	

				    callback();	     		
	     
		      });

		  });
		  req.setHeader('Content-Type', 'application/tar');

		  req.on('error', function (e) {
		    console.log('problem with request: ' + e.message);
		    client.send("build progress", "problem with request: " + e.message);
		    //onResult(null, null, e.message);
		  });

		  fs.createReadStream(filePath).on('data', function (data) {
		    req.write(data);
		  }).on('end', function () {
		    req.end();
		  });

	    },
	    function (callback) {
	      logger.info('Built Image Id: <%s>', builtImageID);
	      var newSetEntryKey = util.format('Image_%d', Date.now());
	      rdsClient.hmset(newSetEntryKey, 'id', newSetEntryKey, 'image_id', builtImageID, 'build_tag', buildTagName, 'repository', remoteBuildTagName, 'build_server', JSON.stringify(buildServer), 'isReplicated', false, 'isPushedOnRegistry', false, 'createdAt', Date.now(), function (err, result) {
	        if (err){
	          callback('Failed to insert record in the database' , err);
	          client.send("build error", 'Failed to insert record in the database: '+ err);
	    	}else {
	          rdsClient.lpush('SubmittedImages', newSetEntryKey, function (err, result) {
	            if (!err) {
	              logger.info('Image information stored successfully');
	              client.send( 'build progress', 'Image information stored successfully');
	              callback();
	            } else {
	              logger.info('Failed to push set key into images list');
	              callback('Failed to push set key into images list');
	            }
	          });
	        }
	      });
	    } 
	  ], function (err, results) {
	    if (err)
	    	client.send("build progress", err);
	  });



	}// end ' buildDockerfile'


  });

