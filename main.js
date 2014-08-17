var treeBuilder = require('./treeBuilder.js'),
	fs = require('fs'),
	http = require('http');

global['svrConfig'] = {};

module.exports = {
	startServer: startServer,
	config: global['svrConfig']
}

function startServer(configFile) {
	loadConfig(configFile);

	var vhosts = svrConfig.vhosts;
	for (var vhost in vhosts) {
		vhosts[vhost].tree = treeBuilder.buildTree(vhosts[vhost].path);
	}

	http.createServer(requestHandler).listen(svrConfig.port, svrConfig.ip);
}

function loadConfig(fileName) {
	svrConfig = JSON.parse(fs.readFileSync(fileName, 'utf8'));
}

function requestHandler(request, response) {
	//TODO: check config for debug flag
	try {
		if (svrConfig.debug) {
			process.stdout.write(request.host + "  " + request.url);
		}

		var host = request.headers.host,
			vhosts = svrConfig.vhosts,
			tree;

		for (var vhost in vhosts) {
			if (vhost === host)
				tree = vhosts[vhost].tree;
		}
		if (!tree) {
			if (vhosts.default) {
				tree = vhosts.default.tree;
			}
			else {
				writeError(400, response);
			}
		}

		var obj = retrieveRequestedObject(request.url, tree);
		if (obj) {
			if (obj.code) {
				var method = request.method.toLowerCase();
				if (obj.code.methods[method]) {

					var context = {
						request: request,
						response: response,
						_obj: obj
					};
					if (obj.template)
						context.finished = renderTemplateAndSend;
					else
						context.finished = sendResponseData;

					obj.code.methods[method](context);
				}
				else
					writeError(405, response);


			}
			else if (obj.src) {
				response.writeHead(200, {'Content-Type': 'text/html'});
				response.end(obj.src);
			}
			else if (obj.path) {
				fs.readFile(obj.path, function (err, data) {
					if (err) throw err;
					response.writeHead(200, {'Content-Type': obj.mimeType});
					response.end(data);
				});
			}
		}
		else {
			writeError(404, response);
		}
	}
	catch (e) {
		writeError(500, response);
		console.log(e);
	}
	if (svrConfig.debug) {
		console.log("  " + response.statusCode);
	}
}

function retrieveRequestedObject(url, tree) {
	var obj = tree;
	var urlComponents = url.split("/");

	for (var i = 0; i < urlComponents.length; ++i) {
		var comp = urlComponents[i];
		if (comp == '')
			continue;
		if (obj[comp])
			obj = obj[comp];
		else
			return null;
	}

	//find index if the url is a directory
	for (var prop in obj) {
		var split = prop.split(".");
		if (split.length > 1)
			var basename = split[0];
		else
			continue;

		if (basename === "index") {
			return obj[prop];
		}
	}
	return obj;
}

function writeError(code, response) {
	//TODO: check for custom error pages specified in config.
	response.writeHead(code, {
		'Content-Type': 'text/html'
	});
	var codeStr = http.STATUS_CODES[code];
	response.end("<html><head><title>" + codeStr + " </title></head><body><h1>" + code + ":" + codeStr + "</h1></body></html>");
}

function renderTemplateAndSend(data) {
	var response = this.response,
		template = this._obj.template;
	response.writeHead(200, {'Content-Type': 'text/html'});
	response.end(template(data));
}
function sendResponseData(data) {
	var response = this.response;
	response.writeHead(200, {'Content-Type': 'application/json'});
	response.end(JSON.stringify(data));
}