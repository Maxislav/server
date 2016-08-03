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
var config = JSON.parse(fs.readFileSync('./server.config.json', "utf8" ).toString());
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
			proxiServ( req, res, config.proxies[i], new Date().getTime() );
			return;
		}
	}
	next();
});
app.use(function(req, res, next){
	'use strict';
	const timeWhait = getRandomInt(1, 10);
	var uri = url.parse( req.url ).pathname;

	/**
	 * Для рандомного таймаута
	 */
	/*setTimeout(function(){
		_use(req, res);
	}, timeWhait);*/
	_use(req, res);
	//console.log(colors.yellow( timeWhait + 'ms ->  ') + colors.gray(uri) );


});




//var server = new http.Server();
var timer = timerFoo();

function timerFoo(){
	return setTimeout(function(){
		console.log('=======================+++++++++++++++++++++=========================='.gray)
	},1000 );
};

function _use ( request, response ) {
	clearTimeout(timer);
	timer = timerFoo();

	var uri = url.parse( request.url ).pathname;
	if ( !checkAccess( request ) ) {
		response.statusCode = 403;
		response.end( 'Error access' );
		console.log( 'Error access'.red );
		return;
	}
	/*var proxiRegex = new RegExp( proxi.source );
	if ( proxiRegex.test( uri ) ) {
		proxiServ( request, response, new Date().getTime() );
		return;
	}*/
	var t0 = new Date().getTime();

	/**
	 * получение емаила
	 */
	if(/^\/mail$/.test(uri)){
		response.end( 'Ololo@mail.ru' );
		return;

	}


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
	filePath = path.join( process.cwd(), filePath );
	fs.stat( filePath, function ( err, status ) {
		if ( err || !status.isFile() ) {
			res.statusCode = 404;
			res.end( 'File not found1' );
			console.log(('File not found ' +filePath).red);
			return;
		}
		var file = new fs.ReadStream( filePath )
		sendFile( file, filePath, res, timeLong );

	} );

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

//server.listen( port );
