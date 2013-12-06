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
var util = require("util");
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

exports.hinspect = function (req, res) {

  var imgIdentifier = req.params.imgIdentifier;
  var selectedHostId = parseInt(req.params.host_id);

  var repository,  hostStatusCode;
  try{
     repository = req.query.repository.trim();
   }catch(err){
      repository = "";
   }

  var imgInfo = {};
  var containerList = [];
  var dockerHostList  = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';


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
      function(callback){
        var cliMessage = null;
        logger.info( "Retrieving image data from : " + hostToQuery);  

        var querystring = '/images/' + imgIdentifier + '/json';
        appUtil.makeGetRequestToHost( hostToQuery, querystring, function (errorMessage, data, statusCode) {
          viewData = '';
          hostStatusCode = statusCode;
          switch (statusCode) {
          case 200:
            viewData = JSON.parse(data);
            break;
          case 404:
            viewData = 'No such image : ' + imgIdentifier;
            errMessages.push({text:viewData, type:'error'});
            break;
          case 500:
            viewData = 'Server Error';
            errMessages.push({text:viewData, type:'error'});            
            break;
          default:
            viewData = 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>';
            errMessages.push({text:viewData, type:'error'});
          }
          logger.info(viewData);
          callback();
        });
      }], function(err){
        if( err)
          errMessages.push({text:err, type:'error'});

        res.render('docker/inspect', {
          title: 'Inspect Docker Image',
          page: 'inspect_image',
          'data': viewData,
          statusCode: hostStatusCode,
          imgInfo: {
            id: imgIdentifier,
            repository: repository,
            created: req.query.created,
            runningOn : hostToQuery
          },
          errorMessages : errMessages
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
  var hostStatusCode = null;
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

      if( selectedHostId === -1){
         callback("Select Docker Host. ");
        return;
      }

      logger.info(" c_DockerHostList length: %d/%d", dockerHostList.length, c_DockerHostList.length);

      var hostToQuery = {};     

       hostToQuery= (c_DockerHostList.filter( function(item){
            return item.id === selectedHostId;
        }))[0];

     if( typeof hostToQuery === 'undefined' ){
        callback( "Invalid Host Id" );
        return;
     }

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
            break;
        }
        logger.info(viewData);
        callback();
      });
    }
	], 
	function(err){
    if( err){
      errMessages.push({text:err, type:'error'});
    }
    res.render('docker/list', {
      title: 'List of images',
      page: 'images_list',
      errorMessages: errMessages,
      'data': viewData,
      'areAll': areAll,
      statusCode: hostStatusCode,
      hostList : c_DockerHostList
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
        text: util.format("<%s:%s> : Conflict in deleting image : \'%s\'", dockerHost.hostname, dockerHost.dockerPort, imgIdentifier ),
        type: 'error'
      };
      break;
    case 404:
      req.session.messages = {
        text: util.format("<%s:%s> : No such image  \'%s\'", dockerHost.hostname, dockerHost.dockerPort, imgIdentifier ),
        type: 'error'
      };
      break;
    case 200:
      req.session.messages = {
        text: util.format("<%s:%s> : Image[%s] deleted successfully.", dockerHost.hostname, dockerHost.dockerPort, imgIdentifier ),
        type: 'alert'
      };
     // res.redirect('/');
      break;
    case 500:
      req.session.messages = {
        text:  util.format("<%s:%s> : Server error.", dockerHost.hostname, dockerHost.dockerPort),
        type: 'error'
      };
      break;
    default:
      req.session.messages = {
        text:  util.format("<%s:%s> : Unable to query docker image. Please check your internet connection. <%s>", dockerHost.hostname, dockerHost.dockerPort, errorMessage ),
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

  var 
    imgIdentifier = null,
    imageId = null,
    repository = null,
    selectedHostId = null,
    dockerHostList,
    hostToQuery    
    ;

  imageId = req.params.imgIdentifier;
  try{
     repository = req.body.repository.trim();
   }catch(err){
      repository = null;
   }



  if( repository != null && repository.length > 0 )
      imgIdentifier = repository;
  else
      imgIdentifier = imageId;


  selectedHostId = parseInt(req.params.host_id);


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
        var cliMessage = null;
        logger.info( "Deleting image from : " + JSON.stringify(hostToQuery));
        var  querystring = '/images/' + encodeURIComponent(imgIdentifier);

        appUtil.makeDELETERequestToHost(hostToQuery,  querystring, function (errorMessage, result, statusCode ) {
          switch (statusCode) {
          case 409:
              cliMessage = util.format("<%s:%s> : Conflict in deleting image : '%s'", hostToQuery.hostname, hostToQuery.dockerPort, imgIdentifier );
              callback( cliMessage );
            break;
          case 404:
             callback( util.format("<%s:%s> : No such image : '%s'", hostToQuery.hostname, hostToQuery.dockerPort, imgIdentifier ) );
            break;
          case 200:
              cliMessage = util.format("<%s:%s> : Image[%s] deleted successfully.", hostToQuery.hostname, hostToQuery.dockerPort, imgIdentifier ) ;            
              logger.info(  );
              req.session.messages = {
                 text: cliMessage,
                 type: 'success'
              };              
              callback();
            break;
          case 500:
              cliMessage = util.format("<%s:%s> : Server error.", hostToQuery.hostname, hostToQuery.dockerPort );
              callback( cliMessage );           
            break;
          default:
            cliMessage = util.format("<%s:%s> : Unable to query docker image. Please check your internet connection. <%s>",  hostToQuery.hostname, hostToQuery.dockerPort, errorMessage ) ;
             callback( cliMessage );
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

          res.redirect(req.headers.referer);
          return;
        }

        res.redirect("/hosts/"+ hostToQuery.id + "/dockers/list");


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
exports.hcontainers = function (req, res) {

  var imgIdentifier = req.params.imgIdentifier;
  var selectedHostId = parseInt(req.params.host_id);

  var repository,  hostStatusCode;
  try{
     repository = req.query.repository.trim();
   }catch(err){
      repository = "";
   }
  var imageId = req.params.id;

  var imgInfo = {};
  var containerList = [];
  var dockerHostList  = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';

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
      function(callback){
        var cliMessage = null;
        logger.info( "Retrieving containers from : " + JSON.stringify(hostToQuery) );  
        var querystring = '/containers/json?all=1&size=1';
        appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode ) {
          hostStatusCode = statusCode;
          logger.info("statuscode:  " + hostStatusCode);
          switch (statusCode) {
            case 200:
              viewData = JSON.parse(data);
              viewData.forEach(function (container, index) {
                logger.info(container.Image);

//TODO
                containerList.push(container);

                if (container.Image === imgIdentifier.substr(0, 12)) {
                  containerList.push(container);
                }
              });
              logger.info(" ContainersList.length " + containerList.length);
              break;
            case 400:
              viewData = 'Bad Parameters ';
              errMessages.push({text:viewData, type:'error'});
              break;
            case 500:
              viewData = 'Server error : ' + errorMessage;
              errMessages.push({text:viewData, type:'error'});
              break;
            default:
              viewData = 'Unable to query list of containers. Please check your network connection.:<'+ errorMessage +'>';
              errMessages.push({text:viewData, type:'error'});
              break;
          }
          logger.info( repository.length === 0 ? '-' :repository);
          logger.info("ContainersList.length " + containerList.length);

          callback();

        });


      }], 
      function(err){
        if( err)
          errMessages.push({text:err, type:'error'});        

        res.render('docker/containers', {
         'containerList': containerList,
          title: 'List of Containers',
          page: 'containers_list',
          id: imgIdentifier,
          'data': viewData,
          'statusCode': hostStatusCode,
          imgInfo: {
            id: imgIdentifier,
            repository: repository,
            created: req.query.created,
            runningOn : hostToQuery
          },
          errorMessages:errMessages
        });

      }
  );
};