/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var logger = require("./config/logger.js");
var socket = require('socket.io');

var server, io;

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
io = socket.listen(server);

server.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});











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



io.sockets.on('connection', function(client){
      console.log("client connected");
      client.set('user', client.id);
      client.emit('identifier', client.id );

      client.emit('messages', true);

	  client.on('Start', function (data) { //data contains the variables that we passed through in the html file
	  		console.log("start triggered");
			var Name = data['Name'];
			var buildName = data['buildName'];
			Files[Name] = {  //Create a new Entry in The Files Variable
				FileSize : data['Size'],
				Data	 : "",
				Downloaded : 0
			}
			var Place = 0;
			try{
				var Stat = fs.statSync('uploads/temp/' +  Name);
				if(Stat.isFile())
				{
					Files[Name]['Downloaded'] = Stat.size;
					Place = Stat.size / 524288;
				}
			}
	  		catch(er){
	  			console.log("Error: ", er);
	  		} //It's a New File
			fs.open("uploads/temp/" + Name, 'a', 0755, function(err, fd){
				if(err)
				{
					console.log(err);
				}
				else
				{
					Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
					client.emit('MoreData', { 'Place' : Place, Percent : 0 });
				}
			});
		});
	
	  client.on('Upload', function (data){
			var Name = data['Name'];
			Files[Name]['Downloaded'] += data['Data'].length;
			Files[Name]['Data'] += data['Data'];
			var buildName =  data['buildName'];
			if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
			{
				fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
					var inp = fs.createReadStream("uploads/temp/" + Name);
					var newFileName = Name + "_" + (+new Date );

					var out = fs.createWriteStream("uploads/" + newFileName);
					inp.pipe(out);
					inp.on("end",  function(){
						fs.unlink("uploads/temp/" + Name, function () { //This Deletes The Temporary File
							console.log("file moved");
							client.emit('Done', {'Dockerfile' : 'uploads/' + Name });
							client.emit('build start', "Starting building...");
							buildDockerfile(buildName, "uploads/" + newFileName);


						});
					});
				});
			}
			else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
				fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
					Files[Name]['Data'] = ""; //Reset The Buffer
					var Place = Files[Name]['Downloaded'] / 524288;
					var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
					client.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
				});
			}
			else
			{
				var Place = Files[Name]['Downloaded'] / 524288;
				var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
				client.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
			}

		});

	

	function buildDockerfile( buildTagName ,filePath){



	  var newFilePath = filePath; //path.join(__dirname, '../uploads');
	//  var buildTagName = "ajax_upload_test_001"; //require('querystring').escape(req.body.build_name);
	  var remoteBuildTagName = encodeURIComponent(config.repository.development.hostname + ':' + config.repository.development.port + '/' + buildTagName);
	  var tarFileUploadedPath = filePath;

	  client.emit("build progress", 'file path' + tarFileUploadedPath);
	  client.emit("build progress",'build name'+ buildTagName);
	  client.emit("build progress", "tag name: " + remoteBuildTagName);

	  if (buildTagName.length == 0) {
	  	client.emit("build error", 'Please provide tag name to build image');
	    return;
	  }


	  var liveHostsList = [];
	  var dockerHostList = [];
	  var dockerfileBuiltReport = [];
	  var buildServer;
	  var builtImageID = null;
	  var repository = config.repository.development;
	  //util.format("%s:%s", config.repository.development.hostname, config.repository.development.port);
	  async.series([
	    function (callback) {
	      appUtil.getDockerHosts(function (err, hostList) {
	        if (err)
	          callback(err, null);
	        else {
	          dockerHostList = hostList;
	          callback();
	        }
	      });
	    },
	    function (callback) {
	      if (dockerHostList.length === 0) {
	        callback('No Docker host available yet.', null);
	        return;
	      }
		  client.emit("build progress","Docker hosts found: " + dockerHostList.length);

	      async.filter(dockerHostList, function (host, cb) {
	        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
	          logger.info('===========================Alive : ' + isAlive);
	          cb(isAlive);
	        });
	      }, function (results) {
	        liveHostsList = results;
	        callback();
	      });
	    },
	    function (callback) {
	      if (liveHostsList.length === 0) {
	        callback('No Docker Server is up. Please try again later. ', null);
	        return;
	      }
  		  client.emit("build progress","live Docker hosts found: " + liveHostsList.length);

	      /*
	      || Dispatch build request
	          |-> Build on one dockerhost
	          |-> Send pull request to all other livehosts
	      ||
	      */
	      buildServer = liveHostsList.pop();
          client.emit("build progress", "build server chooosen: " + JSON.stringify(buildServer) );
	      //Building Image on dockerhost

		  var resBody = '';
		  var queryString =  '/build?t=' + remoteBuildTagName;
		  var options = {
		      hostname: buildServer.hostname,
		      port: buildServer.dockerPort,
		      path: queryString,
		      method: 'POST'
		    };
		  client.emit( "build progress", 'Building dockerfile on ' + JSON.stringify(options));
		  var req = http.request(options, function (res) {

		      console.log('STATUS: ' + res.statusCode);
		      console.log('HEADERS: ' + JSON.stringify(res.headers));
		    
		      client.emit("build progress", 'STATUS: ' + res.statusCode);
		      client.emit("build progress", 'HEADERS: ' + JSON.stringify(res.headers));

		      res.setEncoding('utf8');
		      res.on('data', function (chunk) {
		        resBody += chunk;
		        client.emit("build progress",chunk);
		        logger.info(chunk);
		      });
		      res.on('end', function () {
		     		client.emit("build end", "Build Server response ended");
		     	   //onResult(resBody, res.statusCode, null);
		     
		      });
		  });
		  req.setHeader('Content-Type', 'application/tar');

		  req.on('error', function (e) {
		    console.log('problem with request: ' + e.message);
		    client.emit("build progress", "problem with request: " + e.message);
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
	        if (err)
	          callback('Failed to insert record in the database');
	        else {
	          rdsClient.lpush('SubmittedImages', newSetEntryKey, function (err, result) {
	            if (!err) {
	              logger.info('Image information stored successfully');
	              callback(err);
	            } else {
	              logger.info('Failed to push set key into images list');
	              callback();
	            }
	          });
	        }
	      });
	    } 
	  ], function (err, results) {
	    if (err) {
	      req.session.messages = {
	        text: err ? JSON.stringify(err) : '',
	        type: 'error'
	      };
	      if (dockerfileBuiltReport.length > 0)
	        req.session.messages.errorList = dockerfileBuiltReport;
	      res.redirect('/');
	    } else {
	      res.redirect('/dockerfiles');
	    }
	    //        res.redirect('/dockerfiles/'+ encodeURIComponent(buildTagName) );
	    res.end();
	    return;
	  });



	}// end ' buildDockerfile'


  });

