var should = require('should');
var Primus = require('primus.io');


describe("Upload Dockerfile: ", function(){

	it('should connect to websockets', function(done){
		var Socket = Primus.createSocket({transformer:'websockets'});

		var socket = new Socket('ws://localhost:3000');

		socket.on('open', function () {

		  // Send request to join the news room
		  socket.on('Tango', function(d){
		  		console.log("Data recieved: ", d);
		  		socket.send('Charlie', "OK");
		   });

		  socket.on('ACK', function(d){
		  	console.log("Handshake passed");
		  	done();
		  });

		  socket.on("error", done);

		});

	});

});