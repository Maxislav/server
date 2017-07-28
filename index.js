/**
 * Created by mars on 3/2/16.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


var express = require("express" ),
	http = require( "http" ),
	url = require( "url" ),
	path = require( "path" ),
	fs = require( "fs" ),
	port = 3000, //default 80
	https = require( 'https' ),
	mime = require( 'mime' ),
	colors = require( 'colors' );



var config = JSON.parse(fs.readFileSync('./server/server.config.json', "utf8" ).toString());
port = config.port;
var app  = express();
app.set('port', port);

http.createServer(app).listen(app.get('port'), function(){
	'use strict';
	console.log( ('Server start on port: ' + port).blue );
});




app.use(function(req, res, next){
	'use strict';
	var uri = url.parse( req.url ).pathname;
	for (var i = 0 ; i < config.proxies.length; i++){
		var proxiRegex = new RegExp( config.proxies[i].source );
		if ( proxiRegex.test( uri ) ) {
			console.log(uri);
			proxiServ( req, res, config.proxies[i], new Date().getTime() );
			return;
		}
	}
	next();
});


app.use(main);
var timer = timerFoo();
function timerFoo(){
	return setTimeout(function(){
		console.log('=======================+++++++++++++++++++++=========================='.gray)
	},1000 );
};

function main (request, response ) {
	clearTimeout(timer);
	timer = timerFoo();

	var uri = url.parse( request.url ).pathname;
	if ( !checkAccess( request ) ) {
		response.statusCode = 403;
		response.end( 'Error access' );
		console.log( 'Error access'.red );
		return;
	}
	var t0 = new Date().getTime();
	sendFileSave( url.parse( request.url ).pathname, response, t0 );
}



//server.on( 'request',  );

function checkAccess( req ) {
	return url.parse( req.url, true ).query.secret != 'o_O';
}

function sendFileSave( filePath, res, timeLong ) {

	if ( /\/$/.test( filePath ) ) {
		filePath += 'index.html';
	}

	try {
		filePath = decodeURIComponent( filePath );
	} catch ( err ) {
		res.status = 400;
		res.end( 'Bad request' );
		return;
	}

	if ( ~filePath.indexOf( '\0' ) ) {
		res.statusCode = 400;
		res.end( 'Bad request' );
		return;
	}
	const rootPath  = deepCopy(config.rootPath);

	console.log('filePath ->', filePath)

	zz();
	function zz() {
		if(rootPath.length){

			const _path = path.join( process.cwd() + '/'+rootPath.splice(0,1)[0], filePath );

			console.log('_path->',_path)

			isStat(_path)
				.then(filePath=>{
					const file = new fs.ReadStream( filePath );
					sendFile( file, filePath, res, timeLong );
				})
				.catch(obj=>{
					if(rootPath.length){
						zz()
					}else{
						console.log(obj.message, obj.error);
						res.statusCode = 404;
						res.end( obj.message )
					}
				});
		}
	}
}


function isStat(filePath) {
	return new Promise((resolve, reject)=>{
		fs.stat( filePath, function ( err, status ) {
			if(err){
				reject({
					error: err,
					statusCode: 404,
					message: 'File not found1'
				});
			}else if(status.isDirectory()){
				filePath += '/index.html';
				return isStat(filePath);
			}else if(!status.isFile()){
				reject({
					error: err,
					statusCode: 404,
					message: 'File not found2'
				});
			}
			resolve(filePath);

		} );
	})
}


function sendFile( file, filename, res, timeLong ) {
	'use strict';

	var headers = {};

	var contentType = mime.lookup( filename );
	if(contentType == 'text/html'){
		contentType+="; charset=UTF-8";
	}
	if ( contentType ) {
		headers["Content-Type"] = contentType;

		if(contentType.match(/^video/)){

			return videSend(...arguments)
		}

		console.log('Content-Type ->', contentType)
	}
	res.writeHead( 200, headers );
	file.pipe( res );
	file.on( 'error', function ( err ) {
		res.statuscode = 500;
		res.end( 'Server error' );
		console.error( err );
	} );

	file.on( 'end', function () {
		var resTime = new Date().getTime() - timeLong + 'ms';
		console.log( filename + " : " + resTime );
	} );

	res.on( 'close', function () {
		file.destroy();
	} );


}

function videSend( file, filename, res, timeLong) {
	res.sendFile(filename);
	var resTime = new Date().getTime() - timeLong + 'ms';
	console.log( filename + " : " + resTime );
	return null;
}


function proxiServ( request, response, _options, timeLong ) {
	'use strict';

	var ph = url.parse( request.url );
	var options = {
		port: _options.data.port,
		hostname: _options.data.hostname,
		method: request.method,
		path: ph.path,
		headers: request.headers
	};

	var proxyRequest = https.request( options );


	proxyRequest.on( 'response', function ( proxyResponse ) {
		proxyResponse.on( 'data', function ( chunk ) {
			options;
			var respStr = new Buffer(chunk.toString(), 'binary').toString();
			proxyResponse;
			response.write( chunk, 'binary' );
		} );
		proxyResponse.on( 'end', function () {
			response.end();
			var resTime = new Date().getTime() - timeLong + '';
			console.log( (url.parse( request.url ).pathname + " : " + resTime + 'ms').green );
		} );
		response.writeHead( proxyResponse.statusCode, proxyResponse.headers );
	} );
	proxyRequest.on('error', function(err){
		console.error(err);
		//proxyRequest.end();
		response.statusCode = 204;
		response.end( 'No connect' );
		//proxyRequest.end();
		//response.statuscode = -1;
		//response.end( 'No connect' );
	});
	request.on( 'data', function ( chunk ) {
		proxyRequest.write( chunk, 'binary' );
	} );
	request.on( 'end', function () {
		proxyRequest.end();
	} );

}


// использование Math.round() даст неравномерное распределение!
function getRandomInt(min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function deepCopy (oldObj) {
	var newObj = oldObj;
	if (oldObj && typeof oldObj === "object") {
		newObj = Object.prototype.toString.call(oldObj) === "[object Array]" ? [] : {};
		for (var i in oldObj) {
			newObj[i] = deepCopy(oldObj[i]);
		}
	}
	return newObj;
};


//server.listen( port );