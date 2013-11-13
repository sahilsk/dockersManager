/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var connect = require('connect');
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
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
routes.makeRoutes(app);
http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});