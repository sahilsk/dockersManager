


exports.upload = function (client, data, fn) {
	  console.log(data);

	  client.send("foo", 'reosurces working..');

	  fn('Creature just got data 02: ' + data);
}; 