/*
||hosts.js
||Description:   Contain functions to add, remove or edit dockers host list
||				->index() : entery file . By default it set to list all servers. (redirect @list)
||				->list() : list all servers 
||				->add() :  Add new server
||				->remove() :  remove existing server
||				->edit() :  edit existing server

*/
var config = require('../config/config');
var redis = require('redis');
var appUtil = require('./app_util');

var rdsClient = redis.createClient(config.redis.port, config.redis.hostname);
exports.index = function (req, res) {
  res.redirect('/hosts/list');
};


exports.list = function (req, res) {
  var jHostList = [];
  var i = 0, pendingPingCount = 0;
  rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {

    hostsList.forEach( function(host){
      var jHost =  JSON.parse(host);
      if( typeof jHost.ip !== "undefined" ){
        jHostList.push(jHost);
      }



   });  

    res.render('host/index', {
        title: 'Hosts List',
        hostList: jHostList,
        page: 'hosts_list'
      });


  /*   
      if( typeof jHost.ip !== "undefined" ){
        pendingPingCount++;

        ping.sys.probe(jHost.ip, function(isAlive){
            pendingPingCount--;
            var msg = isAlive ? 'host ' + jHost.ip + ' is alive' : 'host ' + jHost.ip + ' is dead'; 
            console.log(msg); 
            jHost.status = isAlive?"Up":"Down";
            console.log(jHost);
            jHostList.push(jHost);
            areAllHostQueried(pendingPingCount);
        });


      }// end 'if'
      
    });// end 'hostsList'  

    function areAllHostQueried(pendingPingCount){
      if(pendingPingCount === 0){
        res.render('host/index', {
          title: 'Hosts List',
          hostList: jHostList,
          page: 'hosts_list'
        });
      }
    }

  */
     
 
  });
};


exports.serverStatus =function (req, res) {
 if( req.xhr){
    var address = req.query.address;
    appUtil.isHostAlive(address, function(isAlive){
      var msg = isAlive ? 'host ' + address + ' is alive' : 'host ' +address + ' is dead'; 
      console.log(msg);
      res.end( isAlive ? 'Alive':'Dead');   
    });

  }else{
    res.end("Unauthorized Access");
  }

};





exports.new = function (req, res) {
  res.render('host/new', { title: 'Add new host' });
};
exports.add = function (req, res) {

   var hostname =  req.body.hostname;
   var port =  req.body.port;
   var ip =  req.body.ip;

    if (port.length === 0 || port.length===0) {
    req.session.messages = {
      text: 'Please provide IP and Port to point to docker host',
      type: 'error'
    };
    res.redirect('/hosts/new');
    res.end();
    return true;
  }

  var host = {
      name: req.body.hostname,
      ip: req.body.ip,
      port: req.body.port
    };
  rdsClient.incr('global:nextHostId', function (err, incrId) {
    if (!err) {
      var newHost = {
          id: incrId,
          ip: host.ip,
          port: host.port,
          name: host.name
        };
      rdsClient.lpush('hosts', JSON.stringify(newHost), 0, -1, function (err, reply) {
        if (!err) {
          req.session.messages = {
            text: 'New Host Added successfully',
            type: 'alert'
          };
        } else {
          req.session.messages = {
            text: 'Unable to create new host. Cause:  <' + err + '>',
            type: 'error'
          };
        }
        res.redirect('/hosts/list');
      });
    }
  });
};


exports.delete = function (req, res) {
  console.log('Id to delete: ', req.params.id);
  var id = req.params.id;
  rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {
    var recValue = '';
    if (!err) {
      hostsList.forEach(function (host) {
        jHost = JSON.parse(host);
        if (typeof jHost.id != 'undefined' && jHost.id == id) {
          console.log('Host Found');
          recValue = host;
        }
      });
      // end 'forEach'
      if (recValue.length === 0) {
        req.session.messages = {
          text: 'No such record found ',
          type: 'warn'
        };
        res.redirect('/hosts/list');
        return true;
      }
      console.log('Value found. Deleting...');
      rdsClient.lrem('hosts', 1, recValue, function (err, reply) {
        if (!err) {
          console.log('record deleted successfully!! : Records Deleted: ' + reply);
          req.session.messages = {
            text: 'record deleted successfully!!',
            type: 'alert'
          };
        } else {
          console.log('Error deleting: ', err);
          req.session.messages = {
            text: 'Error deleting host entry. Cause: ' + err,
            type: 'error'
          };
        }
        res.redirect('/hosts/list');
      });
    }
  });
};

exports.edit = function (req, res) {
  var id = parseInt(req.params.id);
  var recValue = '';
  var jRecValue;
  console.log('Id to edit: ', id);
  rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {
    if (err) {
      req.session.messages = {
        text: 'Error querying database.CAUSE : ' + err,
        type: 'error'
      };
      res.redirect('/hosts/list');
      return true;
    }
    hostsList.forEach(function (host) {
      jHost = JSON.parse(host);
      console.log(jHost);
      if (typeof jHost.id !== 'undefined' && jHost.id === id) {
        console.log('Host Found');
        recValue = host;
        jRecValue = jHost;
      }
    });
    // end 'forEach'
    if (recValue.length === 0) {
      req.session.messages = {
        text: 'No such record found ',
        type: 'warn'
      };
      res.redirect('/hosts/list');
      return true;
    }
    console.log('Host found.', console.log(jRecValue));
    res.render('host/edit', {
      title: 'Edit Host',
      host: jRecValue
    });
  });
};

exports.update = function (req, res) {
  var id = parseInt(req.body.id);
  rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {
    var recValue = '';
    if (!err) {
      hostsList.forEach(function (host) {
        jHost = JSON.parse(host);
        if (typeof jHost.id != 'undefined' && jHost.id == id) {
          console.log('Host Found');
          recValue = host;
        }
      });
      // end 'forEach'
      if (recValue.length === 0) {
        req.session.messages = {
          text: 'No such record found ',
          type: 'warn'
        };
        res.redirect('/hosts/list');
        return true;
      }
      console.log('Value found. Deleting...');
      rdsClient.lrem('hosts', 1, recValue, function (err, reply) {
        if (!err) {
          console.log('record deleted successfully!! : Records Deleted: ' + reply);
          req.session.messages = {
            text: 'record deleted successfully!!',
            type: 'alert'
          };
        } else {
          console.log('Error deleting: ', err);
          req.session.messages = {
            text: 'Error deleting host entry. Cause: ' + err,
            type: 'error'
          };
        }
        var newHost = {
            id: id,
            ip: req.body.ip,
            port: req.body.port,
            name: req.body.hostname
          };
        rdsClient.lpush('hosts', JSON.stringify(newHost), 0, -1, function (err, reply) {
          if (!err) {
            req.session.messages = {
              text: 'Host Updated successfully',
              type: 'alert'
            };
          } else {
            req.session.messages = {
              text: 'Unable to edit host. Cause:  <' + err + '>',
              type: 'error'
            };
          }
          res.redirect('/hosts/list');
        });
      });
    }
  });
};