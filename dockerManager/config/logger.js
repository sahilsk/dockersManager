var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'dockerManager.log' })
    ]
 });

module.exports = logger;
