module.exports = {
	buildTree : buildTree
}

var fs = require('fs'),
	__ = require('underscore'),
	hand = require('handlebars'),
	mime = require('mime');

function buildTree(baseDir){
	if (!baseDir.match(/\/$/))
		baseDir += "/";

	var tree = {};
	addDirToTree(baseDir, tree, false);
	return tree;
}

function addDirToTree(dir, tree, staticDir){
	var list = fs.readdirSync(dir);
	__.forEach(list, function(name){

		if (name === ".STATIC"){
			staticDir = true;
			return;
		}
		var path = dir + name;
		var stat = fs.statSync(path);
		if (stat.isDirectory()){
			path += "/";
			var newTreeContext = {};
			addDirToTree(path, newTreeContext, staticDir);
			tree[name] = newTreeContext;
		}
		else{
			addFileToTree(path, dir, name, tree, staticDir);
		}
	});
}

function addFileToTree(path, dir, name, tree, staticDir){
	if (staticDir){
		var mimeType = mime.lookup('name');
		tree[name] = {path: path, mimeType: mimeType};
		return;
	}

	var match = path.match(/(?:.*\/)?((.*)\.(.*))$/);
	if (!match)
		return;

	var ext = match[3],
		basename = match[2];

	var obj = {};

	if (isStringInArray(ext, svrConfig.templateExt)){
		var jspath = dir+basename+".js";
		if (fs.existsSync(jspath)){
			obj.code = evalJsCode(fs.readFileSync(jspath, "utf8"));
		}
		else{
			console.log(jspath + " not found");
		}
		var src = fs.readFileSync(path, "utf8");
		obj.template = hand.compile(src);

	}
	else if(isStringInArray(ext, svrConfig.directExt)){
		obj.code = evalJsCode(fs.readFileSync(path, "utf8"));

	}
	else if (isStringInArray(ext, svrConfig.staticExt)){
		obj.src = fs.readFileSync(path, "utf8");
	}

	tree[name] = obj;
}

/*** Utilities ***/
function isStringInArray(string, array){
	for (var i = 0; i < array.length; ++i){
		if (array[i] === string){
			return true;
		}
	}
	return false;
}

function evalJsCode(code){
	var methods = {},
		properties = {};
	eval(code);

	return {methods:methods, properties:properties};
}
/****************/