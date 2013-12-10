var config = {
    docker: {
      hostname: "ec2-54-219-118-62.us-west-1.compute.amazonaws.com" , //'192.168.0.231',
      port: 4273
    },

    redis: {
      development:{
      	hostname:  '192.168.0.231', //"ec2-54-219-118-62.us-west-1.compute.amazonaws.com" ,
      	port: 6379
      },
      schema:{
        submittedImagesList : "SubmittedImages"
      }

    },
    repository :{
    	development:{
        hostname: "50.18.225.222", // "ec2-54-219-118-62.us-west-1.compute.amazonaws.com",
        port: 5000
      } ,
      production:{
        hostname: "ec2-54-219-118-62.us-west-1.compute.amazonaws.com",
        port: 5000
      } 
    },
    build_server : {
        name : "App Build Server",
        hostname: "54.241.62.90",
        dockerPort: 4273
    }
    ,
    globalTimeout:5000


  };
module.exports = config;