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
        hostname: "ec2-54-219-118-62.us-west-1.compute.amazonaws.com",
        port: 5000
      } ,
      production:{
        hostname: "ec2-54-219-118-62.us-west-1.compute.amazonaws.com",
        port: 5000
      } 
    },
    globalTimeout:4000


  };
module.exports = config;