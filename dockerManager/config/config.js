var config = {
    docker: {
      hostname: "ec2-54-219-118-62.us-west-1.compute.amazonaws.com" , //'192.168.0.231',
      port: 4273
    },

    redis: {
      development:{
      	hostname:  "ec2-54-219-118-62.us-west-1.compute.amazonaws.com" ,
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
        hostname: "ec2-54-219-118-62.us-west-1.compute.amazonaws.com" ,
        dockerPort: 4273
    }
    ,
    globalTimeout:5000


  };
module.exports = config;