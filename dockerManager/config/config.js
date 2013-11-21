var config = {
    docker: {
      hostname: '192.168.0.231',//"ec2-54-219-118-62.us-west-1.compute.amazonaws.com" , //'192.168.0.231',
      port: 4273
    },

    redis: {
    	hostname: "192.168.0.231",  // "ec2-54-219-118-62.us-west-1.compute.amazonaws.com" 
    	port: 6379
    },
    repository :{
    	development: "192.168.0.231"
    }

  };
module.exports = config;