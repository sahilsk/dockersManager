/*
||docker.js
||Description:   Contain functions to operate image  using dockers remote api's
||				->index() : entry file
||				->list() : lsit all containers 
||				->progressStatus() : function to track file uploading progress status 
*/
var async = require('async');
var appUtil = require('./app_util');
var logger = require('../config/logger');
var util = require('util');
exports.index = function (req, res) {
  appUtil.makeGetRequest('/images/' + req.params.id + '/json', function (data, statusCode, errorMessage) {
    var viewData = '';
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
      break;
    case 404:
      viewData = 'No such image : ' + req.params.id;
      break;
    case 500:
      viewData = 'Server Error';
      break;
    default:
      logger.info('Unable to query docker image');
      viewData = 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>';
    }
    logger.info(viewData);
    logger.info(statusCode);
    res.render('docker/index', {
      title: 'Manage Image',
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode,
      imgInfo: {
        id: viewData.id,
        name: req.params.id,
        created: viewData.created
      },
      page: 'image_page'
    });
  });
};
exports.inspect = function (req, res) {
  var repository, querystring, hostStatusCode;
  try {
    repository = req.query.repository.trim();
  } catch (err) {
    repository = '';
  }
  var imageId = req.params.id;
  var dockerHost = {
      hostname: req.query.hostname,
      dockerPort: parseInt(req.query.port)
    };
  var imgInfo = {};
  querystring = '/images/' + imageId + '/json';
  appUtil.makeGetRequestToHost(dockerHost, querystring, function (errorMessage, data, statusCode) {
    var viewData = '';
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
      break;
    case 404:
      viewData = 'No such image : ' + req.params.id;
      break;
    case 500:
      viewData = 'Server Error';
      break;
    default:
      logger.info('Unable to query docker image. Please check your internet connection. <' + errorMessage + '>');
      viewData = 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>';
    }
    logger.info(viewData);
    res.render('docker/inspect', {
      title: 'Inspect Docker Image',
      id: imageId,
      'data': viewData,
      statusCode: statusCode,
      imgInfo: {
        id: imageId,
        repository: repository,
        created: req.query.created,
        runningOn: dockerHost
      },
      page: 'inspect_image'
    });
  });
};
exports.hinspect = function (req, res) {
  var imgIdentifier = req.params.imgIdentifier;
  var selectedHostId = parseInt(req.params.host_id);
  var repository, hostStatusCode;
  try {
    repository = req.query.repository.trim();
  } catch (err) {
    repository = '';
  }
  var imgInfo = {};
  var containerList = [];
  var dockerHostList = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Host with id :\'' + selectedHostId + '\' not found.');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info('Retrieving image data from : ' + hostToQuery);
      var querystring = '/images/' + imgIdentifier + '/json';
      appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode) {
        viewData = '';
        hostStatusCode = statusCode;
        switch (statusCode) {
        case 200:
          viewData = JSON.parse(data);
          break;
        case 404:
          viewData = 'No such image : ' + imgIdentifier;
          errMessages.push({
            text: viewData,
            type: 'error'
          });
          break;
        case 500:
          viewData = 'Server Error';
          errMessages.push({
            text: viewData,
            type: 'error'
          });
          break;
        default:
          viewData = 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>';
          errMessages.push({
            text: viewData,
            type: 'error'
          });
        }
        logger.info(viewData);
        callback();
      });
    }
  ], function (err) {
    if (err)
      errMessages.push({
        text: err,
        type: 'error'
      });
    res.render('docker/inspect', {
      title: 'Inspect Docker Image',
      page: 'inspect_image',
      'data': viewData,
      statusCode: hostStatusCode,
      imgInfo: {
        id: imgIdentifier,
        repository: repository,
        created: req.query.created,
        runningOn: hostToQuery
      },
      errorMessages: errMessages
    });
  });
};
exports.list = function (req, res) {
  var areAll = 1;
  if (req.query.all)
    areAll = parseInt(req.query.all);
  var querystring = '/images/json?all=' + areAll;
  var liveHostsList = [];
  var dockerHostList = [];
  var c_DockerHostList = [];
  var hostContainersList = [];
  var hostStatusCode = null;
  var viewData = null;
  var errMessages = [];
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
        callback('No Docker host available yet.');
        return;
      }
      async.map(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          host.isAlive = isAlive;
          cb(null, host);
        });
      }, function (err, results) {
        c_DockerHostList = results;
        callback();
      });
    },
    function (callback) {
      if (c_DockerHostList.length === 0) {
        callback('No Docker Server is available yet. Please try again later. ');
        return;
      }
      logger.info(' c_DockerHostList length: %d/%d', dockerHostList.length, c_DockerHostList.length);
      var hostToQuery = {};
      if (typeof req.query.hostId !== 'undefined' && req.query.hostId) {
        hostToQuery = c_DockerHostList.filter(function (item) {
          return item.id === parseInt(req.query.hostId);
        })[0];
        if (typeof hostToQuery.id === 'undefined' && !hostToQuery.id)
          errMessages.push({
            text: 'Host with id :\'' + req.query.hostId + '\' not found.',
            type: 'error'
          });
      }
      if (typeof hostToQuery.id === 'undefined' && !hostToQuery.id)
        hostToQuery = c_DockerHostList[0];
      logger.info('++++++++++++ ' + JSON.stringify(hostToQuery));
      appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode) {
        hostStatusCode = statusCode;
        switch (statusCode) {
        case 200:
          viewData = JSON.parse(data);
          viewData.runningOn = hostToQuery;
          break;
        case 400:
          viewData = 'Bad Parameters ';
          break;
        case 500:
          viewData = 'Server Error : ' + errorMessage;
          break;
        default:
          errMessages.push({
            text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
            type: 'error'
          });
          viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
        }
        logger.info(viewData);
        callback();
      });
    }
  ], function (err) {
    res.render('docker/list', {
      title: 'List of images',
      'data': viewData,
      'areAll': areAll,
      statusCode: hostStatusCode,
      page: 'images_list',
      hostList: c_DockerHostList,
      errorMessages: errMessages
    });
    res.end();
  });
};
exports.hlist = function (req, res) {
  var areAll = 1;
  if (req.query.all)
    areAll = parseInt(req.query.all);
  var querystring = '/images/json?all=' + areAll;
  var selectedHostId = parseInt(req.params.host_id.trim());
  var dockerHostList = [];
  var c_DockerHostList = [];
  var hostStatusCode = null;
  var viewData = null;
  var errMessages = [];
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
        viewData = 'No Docker Host available yet.';
        callback(viewData);
        return;
      }
      async.map(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          host.isAlive = isAlive;
          cb(null, host);
        });
      }, function (err, results) {
        c_DockerHostList = results;
        callback();
      });
    },
    function (callback) {
      if (c_DockerHostList.length === 0) {
        viewData = 'No Docker Server is available yet. Please try again later. ';
        callback(viewData);
        return;
      }
      if (selectedHostId === -1) {
        callback('Select Docker Host. ');
        return;
      }
      logger.info(' c_DockerHostList length: %d/%d', dockerHostList.length, c_DockerHostList.length);
      var hostToQuery = {};
      hostToQuery = c_DockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Invalid Host Id');
        return;
      }
      logger.info('++++++++++++ ' + JSON.stringify(hostToQuery));
      appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode) {
        hostStatusCode = statusCode;
        switch (statusCode) {
        case 200:
          viewData = JSON.parse(data);
          viewData.runningOn = hostToQuery;
          break;
        case 400:
          viewData = 'Bad Parameters';
          break;
        case 500:
          viewData = 'Server Error : ' + errorMessage;
          break;
        default:
          errMessages.push({
            text: util.format('<%s:%s> Unable to query list of images. Please check your network connection. : <%s>', hostToQuery.hostname, hostToQuery.dockerPort, errorMessage),
            type: 'error'
          });
          viewData = util.format('<%s:%s> Unable to query list of images. Please check your network connection. : <%s>', hostToQuery.hostname, hostToQuery.dockerPort, errorMessage);
          break;
        }
        logger.info(viewData);
        callback();
      });
    }
  ], function (err) {
    if (err) {
      res.render('docker/list', {
        title: 'List of images',
        page: 'images_list',
        criticalError: err,
        hostList: c_DockerHostList,
        statusCode: hostStatusCode
      });
    } else
      res.render('docker/list', {
        title: 'List of images',
        page: 'images_list',
        errorMessages: errMessages,
        'data': viewData,
        'areAll': areAll,
        statusCode: hostStatusCode,
        hostList: c_DockerHostList
      });
  });
};
exports.delete = function (req, res) {
  var repository, querystring, imgIdentifier;
  try {
    repository = req.body.repository.trim();
  } catch (err) {
    repository = '';
  }
  var imageId = req.body.id.trim();
  var dockerHost = {
      hostname: req.body.hostname,
      dockerPort: parseInt(req.body.port)
    };
  if (repository.length > 0) {
    imgIdentifier = repository;
    querystring = '/images/' + repository;
  } else {
    imgIdentifier = imageId;
    querystring = '/images/' + imageId;
  }
  logger.info('Deleting image from : ' + dockerHost);
  appUtil.makeDELETERequestToHost(dockerHost, querystring, function (errorMessage, result, statusCode) {
    switch (statusCode) {
    case 409:
      req.session.messages = {
        text: util.format('<%s:%s> : Conflict in deleting image : \'%s\'', dockerHost.hostname, dockerHost.dockerPort, imgIdentifier),
        type: 'error'
      };
      break;
    case 404:
      req.session.messages = {
        text: util.format('<%s:%s> : No such image  \'%s\'', dockerHost.hostname, dockerHost.dockerPort, imgIdentifier),
        type: 'error'
      };
      break;
    case 200:
      req.session.messages = {
        text: util.format('<%s:%s> : Image[%s] deleted successfully.', dockerHost.hostname, dockerHost.dockerPort, imgIdentifier),
        type: 'alert'
      };
      // res.redirect('/');
      break;
    case 500:
      req.session.messages = {
        text: util.format('<%s:%s> : Server error.', dockerHost.hostname, dockerHost.dockerPort),
        type: 'error'
      };
      break;
    default:
      req.session.messages = {
        text: util.format('<%s:%s> : Unable to query docker image. Please check your internet connection. <%s>', dockerHost.hostname, dockerHost.dockerPort, errorMessage),
        type: 'error'
      };
    }
    res.redirect(req.headers.referer);
  });
};
/* Delete Image:
||  -> Delete first by repotags if present, else image id will be used to delete image
||
*/
exports.hdelete = function (req, res) {
  var targetToDelete = null, imageId = null, repository = null, selectedHostId = null, dockerHostList, hostToQuery;
  imageId = req.params.imgIdentifier;
  try {
    repository = req.body.repository.trim();
  } catch (err) {
    repository = null;
  }
  if (repository != null && repository.length > 0 && repository !== '<none>:<none>')
    targetToDelete = repository;
  else
    targetToDelete = imageId;
  selectedHostId = parseInt(req.params.host_id);
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Host with id :\'' + selectedHostId + '\' not found.');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info('Deleting image from : ' + JSON.stringify(hostToQuery));
      var querystring = '/images/' + encodeURIComponent(targetToDelete);
      appUtil.makeDELETERequestToHost(hostToQuery, querystring, function (errorMessage, result, statusCode) {
        switch (statusCode) {
        case 409:
          cliMessage = util.format('<%s:%s> : Conflict in deleting image : \'%s\'', hostToQuery.hostname, hostToQuery.dockerPort, targetToDelete);
          callback(cliMessage);
          break;
        case 404:
          callback(util.format('<%s:%s> : No such image : \'%s\'', hostToQuery.hostname, hostToQuery.dockerPort, targetToDelete));
          break;
        case 200:
          cliMessage = util.format('<%s:%s> : Image[%s] deleted successfully.', hostToQuery.hostname, hostToQuery.dockerPort, targetToDelete);
          logger.info();
          req.session.messages = {
            text: cliMessage,
            type: 'success'
          };
          callback();
          break;
        case 500:
          cliMessage = util.format('<%s:%s> : Server error.', hostToQuery.hostname, hostToQuery.dockerPort);
          callback(cliMessage);
          break;
        default:
          cliMessage = util.format('<%s:%s> : Unable to query docker image. Please check your internet connection. <%s>', hostToQuery.hostname, hostToQuery.dockerPort, errorMessage);
          callback(cliMessage);
          break;
        }
      });
    }
  ], function (err) {
    if (err) {
      req.session.messages = {
        text: err,
        type: 'error'
      };  //res.redirect(req.headers.referer);
          //return;
    }
    res.redirect('/hosts/' + hostToQuery.id + '/dockers/list');
  });
};
exports.containers = function (req, res) {
  var repository, querystring, hostStatusCode;
  try {
    repository = req.query.repository.trim();
  } catch (err) {
    repository = '';
  }
  var imageId = req.params.id;
  var dockerHost = {
      hostname: req.query.hostname,
      dockerPort: parseInt(req.query.port)
    };
  var imgInfo = {};
  var containerList = [];
  querystring = '/containers/json?all=1';
  appUtil.makeGetRequestToHost(dockerHost, querystring, function (errorMessage, data, statusCode) {
    var viewData = '';
    hostStatusCode = statusCode;
    logger.info('statuscode:  ' + hostStatusCode);
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
      viewData.forEach(function (container, index) {
        logger.info(container.Image);
        if (container.Image === imageId.substr(0, 12)) {
          //TODO 
          containerList.push(container);
        }
      });
      logger.info(' ContainersList.length ' + containerList.length);
      break;
    case 400:
      viewData = 'Bad Parameters ';
      break;
    case 500:
      viewData = 'Server error : ' + errorMessage;
      break;
    default:
      viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
      break;
    }
    logger.info(repository.length === 0 ? '-' : repository);
    logger.info('ContainersList.length ' + containerList.length);
    res.render('docker/containers', {
      'containerList': containerList,
      title: 'List of Containers',
      page: 'containers_list',
      id: imageId,
      data: viewData,
      statusCode: hostStatusCode,
      imgInfo: {
        id: imageId,
        repository: repository,
        created: req.query.created,
        runningOn: dockerHost
      },
      errorMessages: []
    });
  });
};
exports.hcontainers = function (req, res) {
  var imgIdentifier = req.params.imgIdentifier;
  var selectedHostId = parseInt(req.params.host_id);
  var repository, hostStatusCode;
  try {
    repository = req.query.repository.trim();
  } catch (err) {
    repository = '';
  }
  var imageId = req.params.id;
  var imgInfo = {};
  var containerList = [];
  var dockerHostList = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Host with id :\'' + selectedHostId + '\' not found.');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info('Retrieving containers from : ' + JSON.stringify(hostToQuery));
      var querystring = '/containers/json?all=1&size=1';
      appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode) {
        hostStatusCode = statusCode;
        logger.info('statuscode:  ' + hostStatusCode);
        switch (statusCode) {
        case 200:
          viewData = JSON.parse(data);
          viewData.forEach(function (container, index) {
            logger.info(util.format('Comparing with repository: :::::>> <%s>===<%s> ', container.Image, repository));
            if (container.Image === imgIdentifier.substr(0, 12) || container.Image === repository) {
              // TODO
              containerList.push(container);
            }
          });
          logger.info(' ContainersList.length ' + containerList.length);
          break;
        case 400:
          viewData = 'Bad Parameters ';
          errMessages.push({
            text: viewData,
            type: 'error'
          });
          break;
        case 500:
          viewData = 'Server error : ' + errorMessage;
          errMessages.push({
            text: viewData,
            type: 'error'
          });
          break;
        default:
          viewData = 'Unable to query list of containers. Please check your network connection.:<' + errorMessage + '>';
          errMessages.push({
            text: viewData,
            type: 'error'
          });
          break;
        }
        logger.info(repository.length === 0 ? '-' : repository);
        logger.info('ContainersList.length ' + containerList.length);
        callback();
      });
    }
  ], function (err) {
    if (err)
      errMessages.push({
        text: err,
        type: 'error'
      });
    res.render('docker/container/containers', {
      'containerList': containerList,
      title: 'List of Containers',
      page: 'containers_list',
      id: imgIdentifier,
      'data': viewData,
      'statusCode': hostStatusCode,
      errorMessages: errMessages,
      imgInfo: {
        id: imgIdentifier,
        repository: repository,
        created: req.query.created,
        runningOn: hostToQuery
      },
      fullURL : req.protocol + "://" + req.get('host') + req.url
    });
  });
};
exports.hnewContainer = function (req, res) {
  var repository;
  try {
    repository = req.query.repository.trim();
  } catch (err) {
    repository = '';
  }
  res.render('docker/container/new', {
    title: 'Create New Container',
    hostId: parseInt(req.params.host_id),
    imgInfo: {
      id: req.params.imgIdentifier,
      repository: repository,
      created: req.query.created
    },
    commandToRun: 'bash'
  });
};
exports.hcreateContainer = function (req, res) {
  var imgIdentifier = req.params.imgIdentifier;
  var selectedHostId = parseInt(req.params.host_id);
  var imgInfo = {};
  var hostToQuery = {};
  var repository, createdOn = '';
  repository = req.body.repository;
  if (repository === '<none>:<none>')
    repository = '';
  createdOn = req.body.created;
  var containerName = require('querystring').escape(req.body.name.trim());
  //  var Hostname = req.body.Hostname;
  var User = req.body.User;
  var Memory = parseInt(req.body.Memory);
  var MemorySwap = parseInt(req.body.MemorySwap);
  var AttachStdin = typeof req.body.AttachStdin === 'undefined' ? false : true;
  var AttachStdout = typeof req.body.AttachStdout === 'undefined' ? false : true;
  var AttachStderr = typeof req.body.AttachStderr === 'undefined' ? false : true;
  var PortSpecs = req.body.PortSpecs === 'null' ? null : req.body.PortSpecs;
  var Privileged = typeof req.body.Privileged === 'undefined' ? false : true;
  var Tty = typeof req.body.Tty === 'undefined' ? false : true;
  var OpenStdin = typeof req.body.OpenStdin === 'undefined' ? false : true;
  var StdinOnce = typeof req.body.StdinOnce === 'undefined' ? false : true;
  var Env = req.body.Env === 'null' ? null : req.body.Env;
  var Cmd = [
      'node',
      'index.js'
    ];
  //  Cmd.push(req.body.Cmd);
  var Dns = req.body.Dns === 'null' ? null : req.body.Dns;
  var Volumes = { '/dockworker': {} };
  // req.body.Volumes ;
  var VolumesFrom = req.body.VolumesFrom;
  var WorkingDir = '/dockworker';
  //req.body.WorkingDir;
  console.log('AttachStdin : ' + req.body.AttachStdin);
  var jsonContainerData = {
      Name: containerName,
      User: User,
      Memory: Memory,
      MemorySwap: MemorySwap,
      AttachStdin: AttachStdin,
      AttachStdout: AttachStdout,
      AttachStderr: AttachStderr,
      PortSpecs: PortSpecs,
      Privileged: Privileged,
      Tty: Tty,
      OpenStdin: OpenStdin,
      StdinOnce: StdinOnce,
      Env: Env,
      Cmd: Cmd,
      ExposedPorts: { '15000/tcp': {} },
      Dns: Dns,
      Volumes: Volumes,
      VolumesFrom: VolumesFrom,
      WorkingDir: WorkingDir
    };
  if (repository !== '')
    jsonContainerData.Image = repository;
  else
    jsonContainerData.Image = imgIdentifier;
  logger.info(jsonContainerData);
  var jsonPortBinding = {
      'Binds': ['/home/dockworker:/dockworker'],
      'PortBindings': { '15000/tcp': [{ 'HostIp': '0.0.0.0' }] }
    };
  var newContainer_id = null;
  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
        if (err)
          callback(err);
        else {
          dockerHostList = hostList;
          callback();
        }
      });
    },
    function (callback) {
      if (dockerHostList.length === 0) {
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Host with id :\'' + selectedHostId + '\' not found.');
        return;
      }
      callback();
    },
    function (callback) {
      logger.info('Creating Container...====================================');
      jsonContainerData.Hostname = hostToQuery.hostname;
      var str_ContainerData = JSON.stringify(jsonContainerData);
      //res.end( str_ContainerData);
      var headers = {
          'Content-Type': 'application/json',
          'Content-Length': str_ContainerData.length
        };
      var querystring = '/containers/create?name=' + containerName;
      appUtil.makePostRequestToHost(hostToQuery, querystring, headers, str_ContainerData, function (result, statusCode, errorMessage) {
        switch (statusCode) {
        case 404:
          callback('Failed to create container: No such image : \'' + Image + '\' ');
          break;
        case 201:
          var jResult = JSON.parse(result);
          console.log(jResult);
          logger.info('Container[' + jResult.Id + '] created successfully. ');
          if (jResult.Warnings !== 'undefined') {
            logger.info(util.format(' Warnings: %j', jResult.Warnings));
          }
          newContainer_id = jResult.Id;
          callback();
          break;
        case 500:
          callback('Failed to create container.(Server error) ' + result);
          break;
        default:
          callback('Failed to create container. Unable to reach docker host. Please check network connection. : <' + errorMessage + '>');
          break;
        }
      });
    },
    function (callback) {
      logger.info('Starting Container(binding host directory and port)...====================================');
      if (newContainer_id === null || newContainer_id === '') {
        callback('failed to obtain container id: ');
        return;
      }
      var str_jsonPortBinding = JSON.stringify(jsonPortBinding);
      var headers = {
          'Content-Type': 'application/json',
          'Content-Length': str_jsonPortBinding.length
        };
      var querystring = '/containers/' + newContainer_id + '/start';
      appUtil.makePostRequestToHost(hostToQuery, querystring, headers, str_jsonPortBinding, function (result, statusCode, errorMessage) {
        switch (statusCode) {
        case 404:
          req.session.messages = {
            text: 'No such container : \'' + newContainer_id + '\' ',
            type: 'error'
          };
          break;
        case 204:
          logger.info(result);
          req.session.messages = {
            text: 'Container[' + newContainer_id + '] started successfully',
            type: 'alert'
          };
          break;
        case 500:
          req.session.messages = {
            text: 'Container created [' + newContainer_id + '] but failed to start it. Cause: Server error.' + result,
            type: 'error',
            oData: jsonContainerData
          };
          break;
        default:
          req.session.messages = {
            text: 'Container created [' + newContainer_id + '] but Unable to query docker host to start it. Please check network connection. : <' + errorMessage + '>',
            type: 'error',
            oData: jsonContainerData
          };
        }
        callback();
      });
    }
  ], function (err) {
    var redirectUrl = null;
    if (err) {
      req.session.messages = {
        text: err,
        type: 'error',
        oData: jsonContainerData
      };
      redirectUrl = util.format('hosts/%d/dockers/%s/containers/new?repository=%s&created=%s', selectedHostId, imgIdentifier, repository, createdOn);
    } else {
      redirectUrl = util.format('hosts/%s/dockers/%s/containers?repository=%s&created=%s', selectedHostId, imgIdentifier, repository, createdOn);
    }
    logger.info('Redirecting to: %s', redirectUrl);
    res.redirect(redirectUrl);
    return;
  });
};