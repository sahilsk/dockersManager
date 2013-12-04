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


  querystring = '/images/' + imageId + '/json';
  appUtil.makeGetRequestToHost( dockerHost, querystring, function (errorMessage, data, statusCode) {
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
        runningOn : dockerHost
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
  var c_DockerHostList = [];
  var hostContainersList = [];
  var hostStatusCode = [];
  var  viewData = null;
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

      async.map( dockerHostList, function(host,cb){

        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          host.isAlive = isAlive;
          cb(null, host);
        });

      }, function(err, results){
          c_DockerHostList = results;
          callback();
      });

    },
    function (callback) {
      if (c_DockerHostList.length === 0) {
        callback('No Docker Server is available yet. Please try again later. ');
        return;
      }

      logger.info(" c_DockerHostList length: %d/%d", dockerHostList.length, c_DockerHostList.length);

      var hostToQuery = {};
      
      if( typeof req.query.hostId !== 'undefined' && req.query.hostId  ){

         hostToQuery= (c_DockerHostList.filter( function(item){
              return item.id === parseInt( req.query.hostId);
          }))[0];
        if( typeof hostToQuery.id === 'undefined' &&  !hostToQuery.id )
            errMessages.push( { text: "Host with id :'"+ req.query.hostId + "' not found.", type:'error'} );
      }

      if( typeof hostToQuery.id === 'undefined' &&  !hostToQuery.id )
         hostToQuery = c_DockerHostList[0];

      logger.info("++++++++++++ " + JSON.stringify(hostToQuery));


      appUtil.makeGetRequestToHost( hostToQuery, querystring, function (errorMessage, data, statusCode) {
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
            } );
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
          page: 'images_list',
          hostList : c_DockerHostList,
          errorMessages: errMessages
        });
        res.end();

    });
};

exports.hlist = function(req, res){
  var areAll = 1;
  if (req.query.all)
    areAll = parseInt(req.query.all);
  var querystring = '/images/json?all=' + areAll;

  var selectedHostId = parseInt( req.params.host_id.trim());


  var dockerHostList = [];
  var c_DockerHostList = [];
  var hostStatusCode = [];
  var  viewData = null;
  var errMessages = null;

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


      async.map( dockerHostList, function(host,cb){

        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          host.isAlive = isAlive;
          cb(null, host);
        });

      }, function(err, results){
          c_DockerHostList = results;
          callback();
      });

    },
    function (callback) {
      if (c_DockerHostList.length === 0) {
        callback('No Docker Server is available yet. Please try again later. ');
        return;
      }

      logger.info(" c_DockerHostList length: %d/%d", dockerHostList.length, c_DockerHostList.length);

      var hostToQuery = {};
      

       hostToQuery= (c_DockerHostList.filter( function(item){
            return item.id === selectedHostId;
        }))[0];
      if( typeof hostToQuery === 'undefined' )
          errMessages =  { text: "Host with id :'"+selectedHostId + "' not found.", type:'error'} ;


      if( typeof hostToQuery === 'undefined' )
         hostToQuery = c_DockerHostList[0];

      logger.info("++++++++++++ " + JSON.stringify(hostToQuery));


      appUtil.makeGetRequestToHost( hostToQuery, querystring, function (errorMessage, data, statusCode) {
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
            req.session.messages = {
              text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
              type: 'error'
            };
            viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
        }
        logger.info(viewData);
        callback();
      });
    }
	], 
	function(err){

        res.render('docker/list', {
          title: 'List of images',
          'data': viewData,
          'areAll': areAll,
          statusCode: hostStatusCode,
          page: 'images_list',
          hostList : c_DockerHostList,
          messages: errMessages
        });

    });
};



exports.delete = function (req, res) {

  var repository,  querystring, imgIdentifier;
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
     imgIdentifier = repository;
     querystring = '/images/' + repository;
  }else{
    imgIdentifier = imageId;
    querystring = '/images/' + imageId;
  }


  logger.info( "Deleting image from : " + dockerHost);

  appUtil.makeDELETERequestToHost(dockerHost,  querystring, function (errorMessage, result, statusCode ) {
    switch (statusCode) {
    case 409:
      req.session.messages = {
        text: 'Conflict in deleting image : \'' + imgIdentifier + '\' ',
        type: 'error'
      };
      break;
    case 404:
      req.session.messages = {
        text: 'No such image : \'' + imgIdentifier + '\' ',
        type: 'error'
      };
      break;
    case 200:
      req.session.messages = {
        text: '\'' + imgIdentifier + '\' image deleted successfully.',
        type: 'alert'
      };
     // res.redirect('/');
      break;
    case 500:
      req.session.messages = {
        text: 'Server error.',
        type: 'error'
      };
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

exports.hdelete = function (req, res) {


  var imgIdentifier = req.params.imgIdentifier;
  var selectedHostId = parseInt(req.params.host_id);

  var dockerHostList,hostToQuery ;

  async.series([
    //Get dockerhost
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

        hostToQuery= (dockerHostList.filter( function(item){
              return item.id === selectedHostId;
          }))[0];
        if( typeof hostToQuery === 'undefined' ){
             callback( "Host with id :'"+selectedHostId + "' not found.") ;
             return;
        }
        callback();

      },
      //Send delete image request
      function(callback){

        logger.info( "Deleting image from : " + hostToQuery);
        var  querystring = '/images/' + imgIdentifier;

        appUtil.makeDELETERequestToHost(hostToQuery,  querystring, function (errorMessage, result, statusCode ) {
          switch (statusCode) {
          case 409:
              callback( "Conflict in deleting image : \'" + imgIdentifier + "\'" );
            break;
          case 404:
             callback('No such image : \'' + imgIdentifier + '\' ');
            break;
          case 200:
              logger.info('\'' + imgIdentifier + '\' image deleted successfully.');
              callback();
            break;
          case 500:
              callback('Server error.');           
            break;
          default:
             callback('Unable to query docker image. Please check your internet connection. <' + errorMessage + '>');
             break;
          }
        });
      }

    ], function(err){

        if(err){
          req.session.messages = {
             text: err,
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
        viewData = 'Server error : ' + errorMessage;
        break;
      default:
        viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
        break;
    }
    logger.info( repository.length === 0 ? '-' :repository);
    logger.info("ContainersList.length " + containerList.length);

    res.render('docker/containers', {
     'containerList': containerList,
      title: 'List of Containers',
      page: 'containers_list',
      id: imageId,
      'data': viewData,
      'statusCode': statusCode,
      imgInfo: {
        id: imageId,
        repository: repository,
        created: req.query.created,
        runningOn : dockerHost
      }
    });

  });

};