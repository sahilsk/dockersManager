var redis = require('redis');
var util = require('util');
var config = require("./config.js");

console.log("Connecting to Redis Server: ", config.redis.development.hostname,":", config.redis.development.port);
var redisClient = redis.createClient(config.redis.development.port, config.redis.development.hostname);


module.exports = redisClient;