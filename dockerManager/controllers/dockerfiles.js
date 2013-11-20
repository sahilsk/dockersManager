/*
||Dockerfiles.js
||Description:   Contain functions speicific to operations on Dockerfile.
||				->upload() : upload dockerfile
||				->buildDockerfile() : Build dockerfile and create image
||				->progressStatus() : function to track file uploading progress status 
*/
var fs = require('fs');
var path = require('path');
var appUtil = require('./app_util');
var winston = require('winston');
var config = require('../config/config');
var logger = require('../config/logger');
var redis = require('redis');
var rdsClient = redis.createClient(config.redis.port, config.redis.hostname);
var progress = 0;
/*
||	upload(req, res) 
|| 	Description:  Upload dockerfile and build it
*/
exports.upload = function (req, res) {
  var newFilePath = path.join(__dirname, '../uploads');
  var newFileName = 'dockerfile_copy';
  var uploadedBytes = '';
  var buildTagName = req.body.build_name;
  var tarFileUploadedPath = req.files.dockerfile.path;
  var uploadedFileName = req.files.dockerfile.name;
  console.log('file name', uploadedFileName);
  console.log('file path', tarFileUploadedPath);
  console.log('build name', buildTagName);
  if (buildTagName.length == 0) {
    req.session.messages = {
      text: 'Please provide tag name to build image',
      type: 'error'
    };
    res.redirect('/');
    res.end();
    return true;
  }
  if (req.files.dockerfile.name === undefined || req.files.dockerfile.name.length == 0) {
    req.session.messages = {
      text: 'Please select Dockerfile containing .tar file first',
      type: 'error'
    };
    res.redirect('/');
    res.end();
    return true;
  }
  buildDockerfile(tarFileUploadedPath, buildTagName, function (result, status, error) {
    switch (status) {
    case 200:
      console.log('Dockerfile Built successfully');
      req.session.messages = {
        text: 'Dockerfile Built successfully.',
        type: 'alert'
      };
      res.redirect('/dockers/' + buildTagName);
      res.end();
      return true;
      break;
    case 500:
      //jResult = JSON.parse(result);
      console.log(result.message);
      if (result.message.indexOf('exit status 2') !== -1) {
        req.session.messages = {
          text: 'Not a valid tar format.!!',
          type: 'error'
        };
      } else {
        req.session.messages = {
          text: 'Dockerfile not found inside tar. !! ',
          type: 'error'
        };
      }
      break;
    default:
      console.log('Please check your network connection.: ', error);
      req.session.messages = {
        text: 'Unable to query docker image. Please check your internet connection. <' + error + '>',
        type: 'error'
      };
      break;
    }
    res.redirect('/');
    res.end();
  });
  req.on('error', function (e) {
    req.session.messages = {
      text: 'Failed to upload file. Reason: ' + e.message + '',
      type: 'error'
    };
    res.redirect('/' + req.params.id);
    res.end();
  });
};
/*
||
  uploadToAll () :

    1// Get List of live hosts
      getListOfAllHosts()
      forEach currentHost {
          is ( is host alive?){
              live_host_list.push currentHost
          }
      }

    2 // Dispatch build request to all
      live_host_list.each(  current_host){
            send_build_dockerfile_request();
      }

||
*/
exports.uploadToAll = function (req, res) {
  var newFilePath = path.join(__dirname, '../uploads');
  var newFileName = 'dockerfile_copy';
  var uploadedBytes = '';
  var buildTagName = req.body.build_name;
  var tarFileUploadedPath = req.files.dockerfile.path;
  var uploadedFileName = req.files.dockerfile.name;
  console.log('file name', uploadedFileName);
  console.log('file path', tarFileUploadedPath);
  console.log('build name', buildTagName);
  if (buildTagName.length == 0)
  {
    req.session.messages = {
      text: 'Please provide tag name to build image',
      type: 'error'
    };
    res.redirect('/');
    res.end();
    return true;
  }
  if( typeof req.files.dockerfile.name === "undefined" || req.files.dockerfile.name.length === 0) {
    req.session.messages = {
      text: 'Please select Dockerfile containing .tar file first',
      type: 'error'
    };
    res.redirect('/');
    res.end();
    return true;
  }
  var totalHosts = 0;
  var liveHostsList = [];
  var dockerfileBuiltStatus = [];
  rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {
    totalHosts = hostsList.length;
    var pendingHostsCount = hostsList.length;
    hostsList.forEach(function (host) {
      var jHost = JSON.parse(host);
      if (typeof jHost.ip !== 'undefined') {
        appUtil.isDockerServerAlive(jHost.ip, jHost.port, function (isAlive, errorMessage) {
          logger.info('Alive : ' + isAlive);
          if (isAlive === true)
            liveHostsList.push(jHost);
          else
            logger.info('Server %s:%s is not reachable.', jHost.ip, jHost.port);
          pendingHostsCount--;
          prcessLiveHostsIfComplete(pendingHostsCount);
        });  //  end 'isDockerServerAlive()'
      } else
        pendingHostsCount--;
    });  // end 'forEach'
  });
  function prcessLiveHostsIfComplete(pendingHostsCount) {

    if( pendingHostsCount !== 0){
        logger.info('live host count: %d', liveHostsList.length);
        return 0;
    }


    //hostslist complete and live host has list of all live hosts
    logger.info('Starting dsipatching built request to %d docker servers out of %d', liveHostsList.length, totalHosts.length);
    //Get Server load
    liveHostsList = liveHostsList.map(function (host) {
      host.load = parseInt(Math.random(2) * 10);
      return host;
    });

    liveHost =  liveHostsList[0]; //leastLoadedServer( liveHostsList);

    //Build dockerfile on least loaded server
    appUtil.makeFileUploadRequestToHost(liveHost, tarFileUploadedPath, '/build?t=' + require("querystring").escape(buildTagName), function (result, status, error) {
      switch (status) {
      case 200:
        logger.info('Dockerfile Built successfully');
         req.session.messages = {
          ip: liveHost.ip,
          port: liveHost.port,
          status: 'success',
          text: 'Image Built Successfully.!!',
          type:'alert'
        };
        break;
      case 500:
        //jResult = JSON.parse(result);
        console.log(result.message);
        if (result.message.indexOf('exit status 2') !== -1) {
          logger.info('Uploaded file is not a valid tar format.!!');
           req.session.messages = {
            ip: liveHost.ip,
            port: liveHost.port,
            status: 'fail',
            text: 'Uploaded file is not a valid tar format.!!',
            type:'error'

          };
        } else {
           req.session.messages = {
            ip: liveHost.ip,
            port: liveHost.port,
            status: 'fail',
            text: 'Dockerfile not found inside tar. !!',
            type:'error'
          };
        }
        break;
      default:
        logger.info('Please check your network connection. Cause: ' + error);
         req.session.messages = {
          ip: liveHost.ip,
          port: liveHost.port,
          status: 'fail',
          text: 'Unable to query docker image. Please check your internet connection. <' + error + '>',
          type:'error'
        };
        break;
      }
      res.redirect("/");
      res.end();

    });
    // end 'makeFileUploadRequestToHost'

  }
  req.on('error', function (e) {
    req.session.messages = {
      text: 'Failed to upload file. Reason: ' + e.message + '',
      type: 'error'
    };
    res.redirect('/' + req.params.id);
    res.end();
  });
};
/*
||	buildDockerfile(filepath, buildname) 
|| 	Description:  build dockerfile (filePath) and built it with tag 'buildName'
*/
function buildDockerfile(filePath, buildName, onResult) {
  //	onResult("29dfb634e42d75734a2411a16d5b16cbc5b53758ddc221cce954cafac49069d8", "success", null);
  console.log('Building file( ' + buildName + '): ' + filePath);
  appUtil.makeFileUploadRequest(filePath, '/build?t=' + buildName, function (buildResult, statusCode, error) {
    onResult(buildResult, statusCode, error);
  });
}
/*
||	progressStatus() 
|| 	Description:  function to track file uploading progress status 
	ToDo
*/
exports.progressStatus = function (req, res) {
  res.send('progress: ' + parseInt(progress, 10) + '%\n');
};