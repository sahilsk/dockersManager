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
var async = require('async');
var util = require('util');
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
  var buildTagName = require('querystring').escape(req.body.build_name);
  var remoteBuildTagName = encodeURIComponent(config.repository.development.hostname + ':' + config.repository.development.port + '/' + buildTagName);
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
    return;
  }
  if (typeof req.files.dockerfile.name === 'undefined' || req.files.dockerfile.name.length === 0) {
    req.session.messages = {
      text: 'Please select Dockerfile containing .tar file first',
      type: 'error'
    };
    res.redirect('/');
    res.end();
    return;
  }
  var totalHosts = 0;
  var liveHostsList = [];
  var dockerHostList = [];
  var dockerfileBuiltReport = [];
  var buildServer;
  var builtImageID = null;
  var repository = config.repository.development;
  //util.format("%s:%s", config.repository.development.hostname, config.repository.development.port);
  async.series([
    function (callback) {
      getDockerHosts(function (err, hostList) {
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
      async.filter(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('Alive : ' + isAlive);
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
      /*
      || Dispatch build request
          |-> Build on one dockerhost
          |-> Send pull request to all other livehosts
      ||
      */
      buildServer = liveHostsList.pop();
      //Building Image on dockerhost
      buildDockerfileOnHost(buildServer, tarFileUploadedPath, remoteBuildTagName, function (result, statusCode, error) {
        switch (statusCode) {
        case 200:
          logger.info('<%s:%s> : Dockerfile Built successfully.', buildServer.hostname, buildServer.dockerPort);
          req.session.messages = {
            text: util.format('<%s:%s> : Dockerfile Built successfully.', buildServer.hostname, buildServer.dockerPort),
            type: 'alert'
          };
          dockerfileBuiltReport.push({
            text: util.format('<%s:%s> : Dockerfile Built successfully.', buildServer.hostname, buildServer.dockerPort),
            type: 'success'
          });
          builtImageID = result.id;
          if (builtImageID === null)
            callback('Failed to get built image id');
          else
            callback();
          break;
        case 500:
          logger.info('<%s:%s> : Failed to build uploaded Dockerfile. Cause: Server error.', buildServer.hostname, buildServer.dockerPort);
          dockerfileBuiltReport.push({
            text: util.format('<%s:%s> : Failed to build uploaded Dockerfile. Cause: Server error.', buildServer.hostname, buildServer.dockerPort),
            type: 'error'
          });
          callback(util.format('<%s:%s> : Failed to build uploaded Dockerfile. Cause: Server error.', buildServer.hostname, buildServer.dockerPort), null);
          break;
        default:
          logger.info('<%s:%s> : Failed to build uploaded Dockerfile. Host is unreachable.', buildServer.hostname, buildServer.dockerPort);
          dockerfileBuiltReport.push({
            text: util.format('<%s:%s> : Failed to build uploaded Dockerfile.  Host is unreachable.', buildServer.hostname, buildServer.dockerPort),
            type: 'error'
          });
          callback(util.format('<%s:%s> : Failed to build uploaded Dockerfile.  Host is unreachable.', buildServer.hostname, buildServer.dockerPort), null);
          break;
        }
      });
    },
    function (callback) {
      logger.info('Built Image Id: <%s>', builtImageID);
      var newSetEntryKey = util.format('Image_%d', Date.now());
      rdsClient.hmset(newSetEntryKey, 
              'id', newSetEntryKey, 
              'image_id', builtImageID,
              'build_tag', buildTagName,
              'repository', remoteBuildTagName,
              'build_server', JSON.stringify(buildServer), 
              'isReplicated', false, 'createdAt', Date.now(), function (err, result) {
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
    }  /*
     //PUSHing the built image on the registry
    function( callback){  
        appUtil.sendImagePushRequestToHost( buildServer, remoteBuildTagName, repository , function( result, statusCode){
            switch(statusCode){
              case 200:
                logger.info("<%s:%s> : '<%s>' pushed successfully on registry[%s].", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) );
                dockerfileBuiltReport.push( {text: util.format("<%s:%s> : '<%s>' pushed successfully on registry[%s].", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) ), type:"success"});
                 return;
                break;
              case 500:
                logger.info("<%s:%s> : '<%s>' image failed to be pushed on the registry['%s']. Cause: Server error.", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) );
                //dockerfileBuiltReport.push({text: util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Cause: Server error.", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) ), type:"error"});
                callback(util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Cause: Server error.", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) ) );
                return;
                break;
              default:
                logger.info( util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Please verify if host is reachable.", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository)));
                //dockerfileBuiltReport.push({ text: util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Please verify if host is reachable.", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) ), type:"error"});
                callback(util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Cause: Server error.", buildServer.hostname, buildServer.dockerPort, buildTagName, JSON.stringify(repository) ) );
                return;
                break;
            }

            callback();
          });
    },
    //Send PULL request to rest of the hosts
    function(callback){
      if (liveHostsList.length === 0) {
        if(dockerHostList > liveHostsList){
         dockerfileBuiltReport.push({text : 'No other Docker Server is up. Please try again later. ', type:"error"});
        }
        req.session.messages = { errorList: dockerfileBuiltReport };
        callback();
        return;
      }

      async.each( liveHostsList, function(liveHost, cb){
          appUtil.sendImagePullRequestToHost(liveHost, buildTagName, repository, function(result, statusCode, err){
            switch(statusCode){
              case 200:
                logger.info("<%s:%s> : '<%s>' pulled successfully from repository[%s].", liveHost.hostname, liveHost.dockerPort, buildTagName, JSON.stringify(repository) );
                dockerfileBuiltReport.push( {text: util.format("<%s:%s> : '<%s>' pulled successfully from repository[%s].", liveHost.hostname, liveHost.dockerPort, buildTagName, JSON.stringify(repository) ), type:"success"});
                break;
              case 500:
                logger.info("<%s:%s> : '<%s>' image failed to be pulled from repository['%s']. Cause: Server error.", liveHost.hostname, liveHost.dockerPort, buildTagName, JSON.stringify(repository) );
                dockerfileBuiltReport.push({text: util.format("<%s:%s> :'<%s>' image failed to be pulled from repository['%s']. Cause: Server error.", liveHost.hostname, liveHost.dockerPort, buildTagName, JSON.stringify(repository) ), type:"error"});
                break;
              default:
                logger.info( util.format("<%s:%s> :'<%s>' image failed to be pulled from repository['%s']. Please verify if host is reachable.", liveHost.hostname, liveHost.dockerPort, buildTagName, JSON.stringify(repository)));
                dockerfileBuiltReport.push({ text: util.format("<%s:%s> :'<%s>' image failed to be pulled from repository['%s']. Please verify if host is reachable.", liveHost.hostname, liveHost.dockerPort, buildTagName, JSON.stringify(repository) ), type:"error"});
                break;
            }
            cb();
          });

      }, function(err){
        if (err) 
          callback(err,null);
        else 
         req.session.messages = { errorList: dockerfileBuiltReport };
        logger.info("Dockerfiles built process on multiple hosts finished.");
        callback();
      });  // end 'async.each'
    }
    */
  ], function (err, results) {
    if (err) {
      req.session.messages = {
        text: JSON.stringify(err),
        type: 'error'
      };
     if (dockerfileBuiltReport.length > 0)
        req.session.messages.errorList = dockerfileBuiltReport;
      res.redirect('/');
    } else{
      res.redirect('/dockerfiles');
    }
    //        res.redirect('/dockerfiles/'+ encodeURIComponent(buildTagName) );
    res.end();
    return;
  });
};
exports.list = function (req, res) {
  var submittedImageList = [];
  rdsClient.lrange('SubmittedImages', 0, -1, function (err, result) {
    if (err) {
      req.session.messages = {
        text: 'Failed to query redis. Cause: ' + err,
        type: 'error'
      };
      res.redirect('/');
      res.end();
      return;
    }
    logger.info('Keys :> ' + result.length);

    if( result.length === 0 ){
        logger.info("No image uploaded yet.");
        res.render('dockerfile/list', {
          title: 'Submitted Images',
          imageList: submittedImageList
        });
      return;      
    }


    async.each(result, function (key, cb) {
      logger.info('Key :> ' + key);
      //verify if is valid id
      if (key.indexOf('Image_') != -1) {
        //query set to retrieve the list
        rdsClient.hgetall(key, function (e, obj) {
          if (!e) {
            submittedImageList.push(obj);
            cb();
          } else {
            logger.info(e);
            cb(e);
          }
        });
      }
    }, function (err, result) {
      if (!err) {
        logger.info(submittedImageList);
        res.render('dockerfile/list', {
          title: 'Submitted Images',
          page:"SubmittedImages_list",
          imageList: submittedImageList
        });
      } else {
        req.session.messages = {
          text: 'Failed to query redis. Cause: ' + err,
          type: 'error'
        };
        res.redirect('/');
      }
    });  // end async.each
  });
};
exports.show = function (req, res) {
  var buildTagName = req.params.buildTag;
};

exports.push = function (req, res) {
  var recordID = decodeURIComponent(req.params.recordID);
  logger.info("reocrdID: " + recordID);
  var record = null;



  rdsClient.hgetall( recordID, function(err, result){
    if(err || !result){
        req.session.messages = {
          text:"Invalid Submitted Image Record Id. Cause: " + err,
          type:"error"
        };
        res.redirect("/dockerfiles");
        return;
    }

    record = result;
    record.build_server = JSON.parse(result.build_server);

    appUtil.sendImagePushRequestToHost( record.build_server, record.repository, function( result, statusCode, err){
        switch(statusCode){
          case 200:
            logger.info("<%s:%s> : '<%s>' pushed successfully on registry[%s].", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) );
            req.session.messages = {
              text: util.format("<%s:%s> : '<%s>' pushed successfully on registry[%s].", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) ), 
              type:"success"
            };
            break;
          case 201:

            var jResponse = JSON.parse(result);
            if( !jResponse.success){
              logger.info("<%s:%s> : '<%s>' image failed to be pushed on the registry['%s']. Cause:  %s.", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository), JSON.parse(result).message );
              req.session.messages = {
                  text: util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Cause: %s.", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository), JSON.parse(result).message  ),
                type:"error"
              };
            }else{

              if( jResponse.isAlreadyPushed ){
                logger.info("<%s:%s> : '<%s>' is already pushed on registry[%s].", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) );
                req.session.messages = {
                  text: util.format("<%s:%s> : '<%s>' is already pushed on registry[%s].", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) ), 
                  type:"alert"
                };         
              }else{
                logger.info("<%s:%s> : '<%s>' is pushed successfully on registry[%s].", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) );
                req.session.messages = {
                  text: util.format("<%s:%s> : '<%s>' is pushed successfully on registry[%s].", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) ), 
                  type:"success"
                };                  
              }

            }
            break;

          case 500:
            logger.info("<%s:%s> : '<%s>' image failed to be pushed on the registry['%s']. Cause: Server error.", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) );
             req.session.messages = {
                text: util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Cause: Server error.", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository) ),
                type:"error"
              };
            break;
          default:
            logger.info( util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Please verify if host is reachable. Cause: %s", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository), err) );
            req.session.messages = {
             text: util.format("<%s:%s> :'<%s>' image failed to be pushed on the registry['%s']. Please verify if host is reachable. Cause: %s", record.build_server.hostname, record.build_server.dockerPort, record.build_tag, decodeURIComponent(record.repository), err ), 
             type:"error"
            };
            break;
        }
        res.redirect("/dockerfiles");
    });  




  }); // end 'rdsClient.hgetall'



}



function getDockerHosts(callback) {
  var jHostList = [];
  rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {
    if (err) {
      callback(err, null);
      return;
    }
    jHostList = hostsList.map(function (host) {
      return JSON.parse(host);
    });
    async.filter(jHostList, function (host, cb) {
      if (typeof host.hostname !== 'undefined')
        cb(true);
      else
        cb(false);
    }, function (results) {
      logger.info('Finish filtering hosts...' + results.length);
      callback(null, results);
    });
  });
}
/*
||  buildDockerfileOnHost(host, filepath, buildname) 
||  Description:  build dockerfile (filePath) and built it with tag 'buildName'
*/
function buildDockerfileOnHost(host, filePath, buildName, onResult) {
  //  onResult("29dfb634e42d75734a2411a16d5b16cbc5b53758ddc221cce954cafac49069d8", "success", null);
  console.log('Building file( ' + buildName + '): ' + filePath);
  var imageId = null;
  appUtil.makeFileUploadRequestToHost(host, filePath, '/build?t=' + buildName, function (buildResult, statusCode, error) {
    if (statusCode === 200) {
      if (buildResult.toString().indexOf('Successfully built') != -1) {
        logger.info(buildResult.split('Successfully built'));
        imageId = buildResult.split('Successfully built')[1].trim();
      }
    }
    onResult({
      id: imageId,
      serverResponse: buildResult
    }, statusCode, error);
  });
}