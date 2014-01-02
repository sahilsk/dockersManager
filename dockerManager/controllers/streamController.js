var Primus = require('primus.io');
var resource = require('primus-resource');
var logger = require('../config/logger.js');
var http = require('http');
var rdsClient = require('../config/database');
var util = require('util'), Files = {}, fs = require('fs'), async = require('async'), config = require('../config/config.js'), appUtil = require('../controllers/app_util.js');
exports.upload = function (client, data, fn) {
  console.log(data);
  fn('Creature just got data 02: ' + data);
};
var primus;
var connectedClient = null;
exports.init = function (server) {
  primus = new Primus(server, {
    transformer: 'websockets',
    parse: 'JSON'
  });
  primus.use('resource', resource);
  

  primus.on('connection', function (client) {
    connectedClient = client;
    logger.info("Client connected");
    client.send("Tango", "WELCOME");  
    client.on('Charlie', function(d){
      logger.info("Handshake completed.", d);
      client.send('ACK', "recieved");
    });  

    
  });
  
  /**
 * Primus-Resource : Dockerfile
 *
 */
  var Dockerfile = primus.resource('Dockerfile');
  Dockerfile.onuploadAndBuild = function (client, data, fn) {
    if (!connectedClient) {
      console.log('No client connected yet');
      return;
    }
    /**
    * handle_uploadBuild_Dockerfile : Handle Dockerfile upload and build operation
    */
    handle_uploadBuild_Dockerfile(connectedClient, data, function (err) {
      if (err)
        fn({
          text: 'Build finished: ' + err,
          type: 'error'
        });
      else
        fn({
          text: 'Build finished',
          type: 'success'
        });
    });
  };
  /**
 * Primus-Resource : DockerImage
 *
 */
  var DockerImage = primus.resource('DockerImage');
  DockerImage.onpushImage = function (client, data, fn) {
    if (!connectedClient) {
      console.log('No client connected yet');
      return;
    }
    console.log(data);
    /**
    * handle_uploadBuild_Dockerfile : Handle Dockerfile upload and build operation
    */
    handle_push_into_Repository(connectedClient, data, function (err, data) {
      connectedClient.send('push end', '---------- END ------------');
      if (err)
        fn(err);
      else
        fn({
          text: data,
          type: 'success'
        });
    });
  };
  DockerImage.onbroadcastImage = function (client, data, fn) {
    if (!connectedClient) {
      console.log('No client connected yet');
      return;
    }
    console.log(data);
    /**
    * handle_uploadBuild_Dockerfile : Handle Dockerfile upload and build operation
    */
    handle_broadcastImage(connectedClient, data, function (err, data) {
      connectedClient.send('broadcast end', '--------- END ------------');
      if (err)
        fn(err);
      else
        fn({
          report: data,
          type: 'success'
        });
    });
  };
};
// end 'init'
/**
 * handle_uploadBuild_Dockerfile : Handle Dockerfile upload and build operation
 *      
 * @param primus
 */
var handle_uploadBuild_Dockerfile = function (client, data, oResult) {
  console.log('client connected');
  client.send('identifier', client.id);
  /** 
    *   Testing handshake
    */
  client.on('Tango', function (data) {
    client.send('Charlie', client.id);
  });
  client.on('OK', function () {
    console.log('Handshake passed');
  });
  client.on('Start', function (data) {
    var buildName = data.buildName;
    Files[buildName] = {
      FileSize: data.Size,
      Data: '',
      Downloaded: 0
    };
    var Place = 0;
    try {
      var Stat = fs.statSync('uploads/temp/' + buildName);
      if (Stat.isFile()) {
        Files[buildName].Downloaded = Stat.size;
        Place = Stat.size / 524288;
      }
    } catch (er) {
      console.log('Error: ', er);
      client.send('build error', JSON.stringify(er));
    }
    //It's a New File
    fs.open('uploads/temp/' + buildName, 'a', 493, function (err, fd) {
      if (err) {
        console.log(err);
      } else {
        Files[buildName].Handler = fd;
        //We store the file handler so we can write to it later
        client.send('MoreData', {
          'Place': Place,
          Percent: 0
        });
      }
    });
  });
  client.on('Upload', function (data) {
    var buildName = data.buildName;
    Files[buildName].Downloaded += data.Data.length;
    Files[buildName].Data += data.Data;
    var buildName = data.buildName;
    if (Files[buildName].Downloaded == Files[buildName].FileSize)
      //If File is Fully Uploaded
      {
        fs.write(Files[buildName].Handler, Files[buildName].Data, null, 'Binary', function (err, Writen) {
          var inp = fs.createReadStream('uploads/temp/' + buildName);
          var newFileName = buildName + '_' + +new Date();
          var out = fs.createWriteStream('uploads/' + newFileName);
          inp.pipe(out);
          inp.on('end', function () {
            fs.unlink('uploads/temp/' + buildName, function () {
              //This Deletes The Temporary File
              console.log('file moved');
              client.send('Done', { 'Dockerfile': 'uploads/' + buildName });
              client.send('build start', 'Starting building...');
              buildDockerfile(buildName, 'uploads/' + newFileName);
            });
          });
        });
      }
    else if (Files[buildName].Data.length > 10485760) {
      //If the Data Buffer reaches 10MB
      fs.write(Files[buildName].Handler, Files[buildName].Data, null, 'Binary', function (err, Writen) {
        Files[buildName].Data = '';
        //Reset The Buffer
        var Place = Files[buildName].Downloaded / 524288;
        var Percent = Files[buildName].Downloaded / Files[buildName].FileSize * 100;
        client.send('MoreData', {
          'Place': Place,
          'Percent': Percent
        });
      });
    } else {
      var Place = Files[buildName].Downloaded / 524288;
      var Percent = Files[buildName].Downloaded / Files[buildName].FileSize * 100;
      client.send('MoreData', {
        'Place': Place,
        'Percent': Percent
      });
    }
  });
  function buildDockerfile(buildTagName, filePath) {
    var newFilePath = filePath;
    //path.join(__dirname, '../uploads');
    //  var buildTagName = "ajax_upload_test_001"; //require('querystring').escape(req.body.build_name);
    var remoteBuildTagName = encodeURIComponent(config.repository.development.hostname + ':' + config.repository.development.port + '/' + buildTagName);
    var tarFileUploadedPath = filePath;
    client.send('build progress', 'file path' + tarFileUploadedPath);
    client.send('build progress', 'build name' + buildTagName);
    client.send('build progress', 'tag name: ' + remoteBuildTagName);
    if (buildTagName.length == 0) {
      client.send('build error', 'Please provide tag name to build image');
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
          if (!isAlive)
            callback(util.format('Build Server[%s:%s] not alive.', buildServer.hostname, buildServer.dockerPort));
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
        client.send('build progress', 'build server : ' + JSON.stringify(buildServer));
        var resBody = '';
        var queryString = '/build?t=' + remoteBuildTagName;
        var options = {
            hostname: buildServer.hostname,
            port: buildServer.dockerPort,
            path: queryString,
            method: 'POST'
          };
        client.send('build progress', 'Building dockerfile on ' + JSON.stringify(options));
        var req = http.request(options, function (res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            client.send('build progress', 'STATUS: ' + res.statusCode);
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              resBody += chunk;
              client.send('build progress', chunk);
              logger.info(chunk);
            });
            res.on('end', function () {
              client.send('build end', '-------------------- END -------------------');
              if (res.statusCode === 200) {
                if (resBody.toString().indexOf('Successfully built') != -1) {
                  logger.info(resBody.split('Successfully built'));
                  builtImageID = resBody.split('Successfully built')[1].trim();
                  client.send('build progress', 'Built Image Id: ' + builtImageID);
                }
                callback();
              } else {
                client.send('build error', 'Error building image: ' + resBody);
                callback(resBody);
              }
            });
          });
        req.setHeader('Content-Type', 'application/tar');
        req.on('error', function (e) {
          console.log('problem with request: ' + e.message);
          client.send('build progress', 'problem with request: ' + e.message);  //onResult(null, null, e.message);
        });
        fs.createReadStream(filePath).on('data', function (data) {
          req.write(data);
        }).on('end', function () {
          req.end();
        });
      },
      function (callback) {
        logger.info('Built Image Id: <%s>', builtImageID);
        if (typeof builtImageID === 'undefined' || builtImageID === null || builtImageID === '') {
          callback('Failed to get build image id');
          return;
        }
        var newSetEntryKey = util.format('Image_%d', Date.now());
        rdsClient.hmset(newSetEntryKey, 'id', newSetEntryKey, 'image_id', builtImageID, 'build_tag', buildTagName, 'repository', remoteBuildTagName, 'build_server', JSON.stringify(buildServer), 'isReplicated', false, 'isPushedOnRegistry', false, 'createdAt', Date.now(), function (err, result) {
          if (err) {
            callback('Failed to insert record in the database : ' + err);
            client.send('build error', 'Failed to insert record in the database: ' + err);
          } else {
            rdsClient.lpush('SubmittedImages', newSetEntryKey, function (er, result) {
              if (!er) {
                logger.info('Image information stored successfully');
                client.send('build progress', 'Image information stored successfully');
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
      if (err) {
        client.send('build error', err);
        oResult(err, null);
      } else {
        oResult(null, 'Image Built successfully');
      }
    });
  }  // end ' buildDockerfile'
};
/**
 * handle_push_into_Repository : Push built image on the registry(centeral repository)
 *      
 * @param primus
 */
var handle_push_into_Repository = function (client, data, oResult) {
  console.log('client connected');
  client.send('identifier', client.id);
  /** 
    *   Testing handshake
    */
  client.on('Tango', function (data) {
    client.send('Charlie', client.id);
  });
  client.on('OK', function () {
    console.log('Handshake passed');
  });
  /************************** 
   START 
*/
  client.send('push start', 'Starting pushing image : ', data.dImage_id);
  var record = null, recordID = data.dImage_id, cliResponse = {};
  logger.info('reocrdID: ' + recordID);
  rdsClient.hgetall(recordID, function (err, result) {

    if (err || !result) {
      oResult('Invalid Submitted Image Record Id. Cause: ' + err, null);
      client.send('push error', 'Invalid Submitted Image Record Id. Cause: ' + err);
      return;
    }
    record = result;
    record.save = function () {
      var isSaved = false;
      rdsClient.hmset(this.id, 'image_id', this.image_id, 'build_tag', this.build_tag, 'repository', this.repository, 'build_server', JSON.stringify(this.build_server), 'isReplicated', this.isReplicated, 'isPushedOnRegistry', this.isPushedOnRegistry, 'updatedAt', Date.now(), function (err, result) {
        if (err)
          isSaved = false;
        else
          isSaved = true;
        logger.log('::::::::::::::::::: Saved: ' + this.id + ': ' + this.isPushedOnRegistry);
      });
    };
    record.build_server = JSON.parse(result.build_server);
    var queryString = util.format('/images/%s/push', record.repository), headers = { 'X-Registry-Auth': null }, respBody = '', options = {
        hostname: record.build_server.hostname,
        port: record.build_server.dockerPort,
        path: queryString,
        method: 'POST',
        headers: headers
      };
    logger.info(options);
    var req = http.request(options, function (res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        client.send('push progress', 'STATUS: ' + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          logger.info(chunk);
          client.send('push progress', chunk);
          respBody += chunk;
        });
        res.on('end', function () {
          client.send('Push end', '-------------------- END -------------------');
          if (res.statusCode === 200) {
            respBody = respBody.split('}{');
            respBody[0] = respBody[0].trim().replace(new RegExp(' *{'), '');
            respBody[respBody.length - 1] = respBody[respBody.length - 1].trim().replace(new RegExp(' *}'), '');
            respBody = respBody.map(function (item, index) {
              return '{' + item + '}';
            });
            var finalResult = null;
            try {
              finalResult = JSON.parse(respBody[respBody.length - 1]);
              logger.info(finalResult);
              if (typeof finalResult.error !== 'undefined' && finalResult.error) {
                record.isPushedOnRegistry = false;
                client.send('push error', finalResult.error);
                oResult({
                  text: finalResult.error,
                  type: 'error'
                }, null);
              } else {
                record.isPushedOnRegistry = true;
                client.send('push success', JSON.stringify(finalResult));
                oResult(null, JSON.stringify(finalResult));
              }
            } catch (e) {
              logger.error('failed to parse response body ');
              oResult(null, JSON.stringify('failed to parse response body '));
            }
          } else {
            client.send('push error', 'Error pushing image: ' + respBody);
            oResult({
              text: respBody,
              type: 'error'
            }, null);
          }
          record.save();
        });  // end 'res.on'
      });
    req.on('error', function (e) {
      respBody = '';
      logger.info('ERROR: Problem with request: ' + e.message);
      client.send('push error', 'Problem with request: ' + e.message);
      oResult({
        text: finalResult.error,
        type: 'error'
      }, null);
    });
    req.end();
  });  // end 'rdsClient.hgetall'
       /************************** 
END 
*/
};
// end 'handle_push_into_Repository'
var handle_broadcastImage = function (client, data, oResult) {
  console.log('client connected');
  client.send('identifier', client.id);
  /** 
    *   Testing handshake
    */
  client.on('Tango', function (data) {
    client.send('Charlie', client.id);
  });
  client.on('OK', function () {
    console.log('Handshake passed');
  });
  /************************** 
   START 
*/
  var record = null, recordID = data.dImage_id, cliResponse = {}, liveHostsList = [], dockerHostList = [], hostImagePullReport = [], imageToBroadcast = null, repository = config.repository.development;
  async.series([
    function (callback) {
      rdsClient.hgetall(recordID, function (err, result) {
        if (err) {
          callback(err, null);
          return;
        }
        imageToBroadcast = result;
        imageToBroadcast.build_server = JSON.parse(result.build_server);
        imageToBroadcast.save = function () {
          var isSaved = false;
          rdsClient.hmset(this.id, 'image_id', this.image_id, 'build_tag', this.build_tag, 'repository', this.repository, 'build_server', JSON.stringify(this.build_server), 'isReplicated', this.isReplicated, 'isPushedOnRegistry', this.isPushedOnRegistry, 'updatedAt', Date.now(), function (err, result) {
            if (err)
              isSaved = false;
            else
              isSaved = true;
            logger.log('::::::::::::::::::: Saved: ' + this.id + ': ' + this.isPushedOnRegistry);
          });
        };
        // end 'save'
        callback();
      });
    },
    function (callback) {
      logger.info(':::::::::::::::::::: isPushedOnRegistry : ' + imageToBroadcast.isPushedOnRegistry);
      if (imageToBroadcast.isPushedOnRegistry === false) {
        callback('Image is not pushed on the registry. Please push it first!!', null);
      } else
        callback();
    },
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
        if (err)
          callback(err, null);
        else {
          dockerHostList = hostList.filter(function (host) {
            return true;  //!(host.hostname.toString() === imageToBroadcast.build_server.hostname && host.dockerPort === imageToBroadcast.build_server.dockerPort);
          });
          logger.info('Docker Host Count: %d/%d ', dockerHostList.length, hostList.length);
          client.send('broadcast progress', util.format('Docker Host Count: %d/%d ', dockerHostList.length, hostList.length));
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
          logger.info('=========================Alive : ' + isAlive);
          client.send('broadcast progress', util.format('===========%s:%s => Alive : %s', host.hostname, host.dockerPort, isAlive));
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
      logger.info('Live Docker Host Count: %d/%d ', liveHostsList.length, dockerHostList.length);
      client.send('broadcast progress', util.format('Live Docker Host Count: %d/%d ', liveHostsList.length, dockerHostList.length));
      var queryString = '/images/create?fromImage=' + imageToBroadcast.repository;
      async.each(liveHostsList, function (liveHost, cb) {
        var cliResponse = null;
        client.send('broadcast progress', util.format('Dispatching pull request to : %s<%s:%s>', liveHost.name, liveHost.hostname, liveHost.dockerPort));
        var respBody = '', options = {
            hostname: liveHost.hostname,
            port: liveHost.dockerPort,
            path: queryString,
            method: 'POST'
          };
        logger.info(options);
        client.send('broadcast progress', JSON.stringify(options));
        var req = http.request(options, function (res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            client.send('broadcast progress', 'STATUS: ' + res.statusCode);
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              logger.info(chunk);
              client.send('broadcast progress', chunk);
              respBody += chunk;
            });
            res.setTimeout(1000, function () {
              //res.destroy();    
              console.log('::::::::::::::::::::: Ending response....');
              client.send('broadcast error', 'Ending response');
            });
            res.on('end', function () {
              console.log('End called ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
              switch (res.statusCode) {
              case 200:
                cliResponse = util.format('<%s:%s :> Image[%s] pull request received.', liveHost.hostname, liveHost.dockerPort, decodeURIComponent(imageToBroadcast.repository));
                logger.info(cliResponse);
                hostImagePullReport.push({
                  text: cliResponse,
                  type: 'success'
                });
                client.send('broadcast success', cliResponse);
                //imageToBroadcast.isReplicated = true;
                //imageToBroadcast.save();
                break;
              case 500:
                cliResponse = util.format('<%s:%s :> Failed to pull image[%s]. Cause: server error', liveHost.hostname, liveHost.dockerPort, decodeURIComponent(imageToBroadcast.repository));
                logger.info(cliResponse);
                client.send('broadcast error', JSON.stringify(cliResponse));
                hostImagePullReport.push({
                  text: cliResponse,
                  type: 'error'
                });
                break;
              default:
                cliResponse = util.format('<%s:%s> :Host is unreachable.', liveHost.hostname, liveHost.dockerPort);
                logger.info(cliResponse);
                client.send('broadcast error', JSON.stringify(cliResponse));
                hostImagePullReport.push({
                  text: cliResponse,
                  type: 'error'
                });
                break;
              }
              cb();
            });  // end 'res.on'
          });
        req.on('error', function (e) {
          respBody = '';
          cliResponse = 'ERROR: Problem with request: ' + e.message;
          logger.info(cliResponse);
          client.send('broadcast error', cliResponse);
          hostImagePullReport.push({
            text: cliResponse,
            type: 'error'
          });
        });
        req.end();
      }, function (err) {
        callback();
      });  // end 'async.each'
    }
  ], function (err, result) {
    if (err) {
      client.send('broadcast error', JSON.stringify(err));
      oResult({
        text: JSON.stringify(err),
        type: 'error'
      }, null);
    }
    if (hostImagePullReport.length > 0)
      oResult(null, { hostPullReport: hostImagePullReport });
  });  /************************** 
END 
*/
};  // end 'handle_broadcastImage'
