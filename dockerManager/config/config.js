var config = {
    domain: {
      root: "runnable",
      tld: "pw",
      subdomain: "www"
    },
    docker: {
      hostname: "54.219.217.19" , //'192.168.0.231',
      port: 4273
    },
    redis: {
      development:{
      	hostname:  "54.219.217.19" ,
      	port: 6379
      },
      schema:{
        submittedImagesList : "SubmittedImages"
      }

    },
    repository :{
    	development:{
        hostname: "50.18.225.222", // "54.219.217.19",
        port: 5000
      } ,
      production:{
        hostname: "54.219.217.19",
        port: 5000
      } 
    },
    build_server : {
        name : "Docker App Server",
        hostname: "50.18.225.222" ,
        dockerPort: 4273
    },
    frontdoor : {
      name : "frontdoor-sk",
      hostname: '50.18.15.145',
      port:7050
    },
    globalTimeout:5000


  };
module.exports = config;