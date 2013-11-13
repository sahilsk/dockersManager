/*
||docker.js
||Description:   Contain functions to operate image  using dockers remote api's
||				->index() : entery file
||				->list() : lsit all containers 
||				->progressStatus() : function to track file uploading progress status 
*/
var appUtil = require('./app_util');
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
      console.log('Unable to query docker image');
      viewData = 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>';
    }
    console.log(viewData);
    console.log(statusCode);
    res.render('docker/index', {
      title: 'Manage Image',
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode,
      imgInfo: {
        id: viewData.id,
        name: req.params.id,
        created: viewData.created
      }
    });
  });
};
exports.inspect = function (req, res) {
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
      console.log('Unable to query docker image');
      viewData = 'Unable to query docker image. Please check your internet connection. <' + errorMessage + '>';
    }
    console.log(viewData);
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
  appUtil.makeGetRequest('/images/json?all=1', function (data, statusCode, errorMessage) {
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
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
      viewData = 'Unable to communicate';
    }
    console.log(viewData);
    res.render('docker/list', {
      title: 'List of images',
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode,
      page: 'images_list'
    });
  });
};
exports.delete = function (req, res) {
  appUtil.makeDELETERequest('/images/' + req.params.id, function (result, statusCode, errorMessage) {
    switch (statusCode) {
    case 409:
      req.session.messages = {
        text: 'Conflict in deleting image : \'' + req.params.id + '\' ',
        type: 'error'
      };
      res.redirect('/dockers/' + req.params.id);
      break;
    case 404:
      req.session.messages = {
        text: 'No such image : \'' + req.params.id + '\' ',
        type: 'error'
      };
      res.redirect('/dockers/' + req.params.id);
      break;
    case 200:
      req.session.messages = {
        text: '\'' + req.params.id + '\' image deleted successfully.',
        type: 'alert'
      };
      res.redirect('/');
      break;
    case 500:
      req.session.messages = {
        text: 'Server Error.',
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
  var dockerID = req.params.id;
  var imgInfo = {};
  appUtil.makeGetRequest('/containers/json?all=1&size=1', function (data, statusCode, errorMessage) {
    var viewData = '';
    var containerList = [];
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
      viewData.forEach(function (container, index) {
        console.log(container.Image);
        if (container.Image === dockerID.substr(0, 12)) {
          containerList.push(container);
        }
      });
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
      viewData = 'Unable to communicate';
    }
    console.log(req.query.repository.length == 0 ? req.query.repository : '-');
    res.render('docker/containers', {
      title: 'List of Containers',
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode,
      page: 'containers_list',
      imgInfo: imgInfo = {
        id: dockerID,
        name: req.query.repository.length == 0 ? req.query.repository : '---',
        created: req.query.created
      },
      containerList: containerList
    });
  });
};