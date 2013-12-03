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

  var querystring = '/images/' + req.params.id + '/json';
  appUtil.makeGetRequest( querystring, function (data, statusCode, errorMessage) {
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
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode,
      imgInfo: {
        id: viewData.id,
        name: req.params.id,
        created: viewData.created
      },
      page: 'inspect_image'
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
  var hostContainersList = [];
  var hostStatusCode = [];
  var  viewData = null;

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
      async.filter(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          cb(isAlive);
        });
      }, function (results) {
        liveHostsList = results;
        callback();
      });
    },
    function (callback) {
      if (liveHostsList.length === 0) {
        callback('No Docker Server is up. Please try again later. ');
        return;
      }
      var liveHost = liveHostsList[ parseInt(liveHostsList.length/3) ];
      appUtil.makeGetRequestToHost(liveHost, querystring, function (errorMessage, data, statusCode) {
        hostStatusCode = statusCode;
        switch (statusCode) {
          case 200:
            viewData = JSON.parse(data);
            viewData.runningOn = liveHost;
            break;
          case 400:
            viewData = 'Bad Parameters ';
            break;
          case 500:
            viewData = 'Server Error : ' + errorMessage;
            break;
          default:
            req.session.messages = {
              text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
              type: 'error'
            };
            viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
        }
        logger.info(viewData);
        callback();
      });
    }], function(err){

        res.render('docker/list', {
          title: 'List of images',
          'data': viewData,
          'areAll': areAll,
          statusCode: hostStatusCode,
          page: 'images_list'
        });

    });


};
exports.delete = function (req, res) {

  var repository,  querystring;
  try{
     repository = req.body.repository.trim();
   }catch(err){
      repository = "";
   }



  var imageId = req.body.id.trim();
  var dockerHost  =  { 
            hostname: req.body.hostname,
            dockerPort : parseInt(req.body.port) 
          };

  if( repository.length > 0){
     querystring = '/images/' + repository;
  }else
     querystring = '/images/' + imageId;

  logger.info( "Deleting image from : " + dockerHost);

  appUtil.makeDELETERequestToHost(dockerHost,  querystring, function (errorMessage, result, statusCode ) {
    switch (statusCode) {
    case 409:
      req.session.messages = {
        text: 'Conflict in deleting image : \'' + repository + '\' ',
        type: 'error'
      };
      res.redirect('/dockers/' + repository);
      break;
    case 404:
      req.session.messages = {
        text: 'No such image : \'' + repository + '\' ',
        type: 'error'
      };
      res.redirect('/dockers/' + repository);
      break;
    case 200:
      req.session.messages = {
        text: '\'' + repository + '\' image deleted successfully.',
        type: 'alert'
      };
      res.redirect('/');
      break;
    case 500:
      req.session.messages = {
        text: 'Server error.',
        type: 'error'
      };
      res.redirect('/');
      break;
    default:
      req.session.messages = {
        text: 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>',
        type: 'error'
      };
    }
    res.redirect(req.headers.referer);
  });
};
exports.containers = function (req, res) {

  var repository,  querystring, hostStatusCode;
  try{
     repository = req.query.repository.trim();
   }catch(err){
      repository = "";
   }
  var imageId = req.params.id;
  var dockerHost  =  { 
            hostname: req.query.hostname,
            dockerPort : parseInt(req.query.port) 
          };

  var imgInfo = {};
  var containerList = [];

  
  querystring = '/containers/json?all=1&size=1';

  appUtil.makeGetRequestToHost(dockerHost, querystring, function (errorMessage, data, statusCode ) {
    var viewData = '';
    
    hostStatusCode = statusCode;
    logger.info("statuscode:  " + hostStatusCode);
    switch (statusCode) {
      case 200:
        viewData = JSON.parse(data);
        viewData.forEach(function (container, index) {
          logger.info(container.Image);
          if (container.Image === imageId.substr(0, 12)) {
            containerList.push(container);
          }
        });
        logger.info(" ContainersList.length " + containerList.length);
        break;
      case 400:
        viewData = 'Bad Parameters ';
        break;
      case 500:
        viewData = 'Server Error : ' + errorMessage;
        break;
      default:
        viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
        break;
    }
    logger.info( repository.length === 0 ? '-' :repository);
    logger.info(" ContainersList.length " + containerList.length);

    res.render('docker/containers', {
      title: 'List of Containers',
      page: 'containers_list',
      id: imageId,
      'data': viewData,
      'statusCode': hostStatusCode,
      's': containerList,
      imgInfo: {
        id: imageId,
        name: repository,
        created: req.query.created
      }
    });
  });

};