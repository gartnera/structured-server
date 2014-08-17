var server = require("./main.js");

server.startServer("/etc/structured-server.json");

var argv = process.argv;
for (var i = 1; i<argv.length; ++i){
	if (argv[i] === "-d")
		svrConfig.debug = true;
}