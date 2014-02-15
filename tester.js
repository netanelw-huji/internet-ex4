var http = require('http');
var net = require('net');
var miniExpress = require('./miniExpress');


var HOST = 'localhost';
var PORT = 3000;
var FILES = ['/profile.html','/profile.css','/pic.jpg','/calculator.js','/calculator.css'];
var CONTENT_TYPES = {	'html' 	: 'text/html',
						'js'	: 'application/javascript',
						'css'	: 'text/css',
						'jpg'	: 'image/jpeg',
						'jpeg'	: 'image/jpeg',
						'gif'	: 'image/gif'	};
var STATUS_CODE_REGEX = /\d{3}/;


var app = miniExpress();

function setupServer(port) {
	app.get('/',miniExpress.static(__dirname + '/www'));
	return app.listen(port);
}


//#############################################################################
//#############################################################################
//#######################  S T A T I C   T E S T S  ###########################
//#############################################################################
//#############################################################################


function handleExistingResourceResponse(resp) {
	var body = [];

	resp.on('data', function (chunk) {
		body.push(chunk);
	});

	resp.on('end', function () {
		body = Buffer.concat(body);
		var ctype = resp.req.path.split('.');
		ctype = ctype[ctype.length-1];

		if (resp.statusCode != 200) {
			console.log('FAILED - no 200 status: ' + ctype);
			return;
		} 
		if (resp.headers['date'] === undefined) {
			console.log('FAILED - no date header: ' + ctype);
			return;
		}
		if (resp.headers['content-type'] === undefined || 
				resp.headers['content-length'] === undefined) {
			console.log('FAILED - no content-length/type header: ' + ctype);
			return;
		} 
		if (resp.headers['content-length'] != body.length ||
				resp.headers['content-type'] != CONTENT_TYPES[ctype]) {
			console.log('FAILED - non matching content length/type: ' + ctype);
			return;
		}
		console.log('SUCCESS: ' + ctype);
	});
}

function testExistingResourceRequest() {
	logTest('Trying to receive files from server. HTTP version: HTTP/1.1\n' + 
			'Testing: 200 status, correct content type & length, existing date header:');

	for (var i=0 ; i<FILES.length-1 ; i++) {
		var req = 	{	httpVersion : '1.1',
						hostname 	: HOST,
						port 		: PORT,
						path		: FILES[i],
						headers		: {host : 'www.somehost.com'}
				 	};
		http.get(req, function (resp) {
			handleExistingResourceResponse(resp);
		}).on('error', function (e) { console.log('FAILED'); });
	}
}

function testNonExistingResourceRequest() {
	logTest('Trying to receive files that don\'t exist on the server.\n' + 
			'Expecting error 404:');

	var req = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					path		: '/non_existing_file.html',
					headers		: {host : 'www.somehost.com'}
			 	};
	http.get(req, function (resp) {
		if (resp.statusCode == 404) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - didn\'t return error 404 on non-existing file.');
		}
	}).on('error', function (e) { console.log('FAILED ' + e.message); });
}

function testNonHttpRequest() {
	logTest('Testing: Non-HTTP request is responded with error 500:');
	var resp = [];

	var socket = net.connect({port: PORT, host: HOST}, function () {
		socket.write('NON HTTP MESSAGE\n\n');
	});
	socket.on('data', function(chunk) {	
		resp = chunk.toString();
		if (resp != '' && resp.match(STATUS_CODE_REGEX)[0] == 500) {
			console.log('SUCCESS'); //illegal request detected!
		} else {
			console.log('FAILED - didn\'t respond with error 500 on non-HTTP request.');
		}
		socket.end();
	});
}

function testDirectoryTraversal() {
	logTest('Trying to receive a file outside root directory (dir. traversal).\n' + 
			'Expecting error 403 (Forbidden):');

	var req = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					path		: '/../tester.js',
			 	};
	http.get(req, function (resp) {
		if (resp.statusCode == 403) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - server sent a file which is forbidden for the client.');
		}
	}).on('error', function (e) { console.log('FAILED'); });
}


//#############################################################################
//#############################################################################
//######################  E X P R E S S   T E S T S  ##########################
//#############################################################################
//#############################################################################

function testJsonPut() {
	logTest('Checking that the json response returns the correct object.\n' + 
			'Checking that the json middleware works.\n' + 
			'Using PUT Request');

	var jsonMware = miniExpress.json();

	app.put('/handle_json', function(req,resp,next) {
		jsonMware(req,resp, function () {
			resp.json(req.body);
			next();
		});
	});

	var obj = {a:1,b:{c:2},d:[3,4,5]};
	var objStr = JSON.stringify(obj);

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					method		: 'PUT',
					path		: '/handle_json',
					headers		: {host : 'www.somehost.com', 'content-length' : objStr.length}
			 	};
	var req = http.request(opts, function (resp) {
		resp.on('data', function (data) {
			try {
				var parsedObj = JSON.parse(data);
				if (JSON.stringify(parsedObj) === objStr && resp.headers['content-type'] == 'application/json') {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - return jsond object has changed: ' + data);
				}
			} catch(e) {
				console.log('FAILED - non-JSON.');
			}
		});
	});
	req.write(objStr);
}


function testUrlencodePost() {
	logTest('Checking that the urlencode middleware parses the body correctly.\n' + 
			'Using POST Request');

	var urlencMware = miniExpress.urlencoded();

	app.post('/handle_urlenc', function(req,resp,next) {
		urlencMware(req,resp, function () {
			resp.json(req.body);
			next();
		});
	});

	var postBody = 'name=netanel&age=23&cat=moo';
	var postBodyObjStr = JSON.stringify({name:'netanel', age:'23', cat:'moo'});

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: '/handle_urlenc/somepath',
					headers		: {	host : 'www.somehost.com', 
									'content-length' : postBody.length,
									'content-type' : 'application/x-www-form-urlencoded'}
			 	};
	var req = http.request(opts, function (resp) {
		resp.on('data', function (data) {
			try {
				if (postBodyObjStr == data) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - return didn\'t parse body correctly: ' + data);
				}
			} catch(e) {
				console.log('FAILED');
			}
		});
	});
	req.write(postBody);
}


function testBodyParseDelete() {
	logTest('Checking the bodyParser middleware.\n' + 
			'Using DELETE Request');

	var bodyparseMware = miniExpress.bodyParser();

	app.delete('/handle_bodyp', function(req,resp,next) {
		bodyparseMware(req,resp, function () {
			resp.json(req.body);
			next();
		});
	});

	var obj = {a:1,b:{c:2},d:[3,4,5]};
	var objStr = JSON.stringify(obj);

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					method		: 'DELETE',
					path		: '/handle_bodyp/somepath2/cat/goes/moo',
					headers		: {	host : 'www.somehost.com', 
									'content-length' : objStr.length}
			 	};
	var req = http.request(opts, function (resp) {
		resp.on('data', function (data) {
			try {
				var parsedObj = JSON.parse(data);
				if (JSON.stringify(parsedObj) === objStr) {
					console.log('SUCCESS');
				} else {
					console.log('FAILED - return jsond object has changed: ' + data);
				}
			} catch(e) {
				console.log('FAILED.');
			}
		});
	});
	req.write(objStr);
}


function testIllegalMethod() {
	logTest('Checking that non-POST/GET/PUT/DELETE requests aren\'t accepted.\n' + 
			'Expecting error 405 (method not allowed).');

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					method		: 'OPTIONS',
					path		: '/profile.html',
					headers		: {	host : 'www.somehost.com'}
			 	};
	var req = http.get(opts, function (resp) {
		if (resp.statusCode == 405) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - didn\'t return error 405 on illegal method.');
		}
	});
}


function testParsing() {
	logTest('Checking parsing of request\'s params, query and cookies.\n' + 
			'Also checking path+host parsing if the host is implicitly included in the path,\n' + 
			'And checking param() and use().\n' + 
			'Using POST request');

	var cookieparseMware = miniExpress.cookieParser();

	app.post('/parsetest/:name/a/:id/b/:age', function(req,resp,next) {
		cookieparseMware(req,resp, function () {
			if(JSON.stringify(req.params) != JSON.stringify({name:'netanel',id:'305614018',age:'23'})) {
				console.log('Failed parsing params.');
			} else if(JSON.stringify(req.query) != JSON.stringify({q1:'a',qb: {x:'y'} ,qc:'3'})) {
				console.log('Failed parsing query.');
			} else if(JSON.stringify(req.cookies) != JSON.stringify({name1:'value1',name2:'value2'})) {
				console.log('Failed parsing cookies.');
			} else if (req.param('age') != 23) {
				console.log('Failed - using param()');
			} else if (!req.is('text/html') || !req.is('html') || !req.is('text/*')) {	//testing 3 formats.
				console.log('Failed - using is()');
			} else if (req.host != 'localhost') {
				console.log('Failed - wrong host');
			} else {
				console.log('SUCCESS');
			}
			next();
		});
	});

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					method		: 'POST',
					path		: 'http://localhost:3000/parsetest/netanel/a/305614018/b/23/s/index.html?q1=a&qb[x]=y&qc=3',
					headers		: {	/* host is a part of the path */ 
									cookie: 'name1=value1; name2=value2', 'content-type' : 'text/html; charset=utf-8'}
			 	};
	var req = http.get(opts);
}


function testSetCookie() {
	logTest('Checking the cookie() function used to set cookies.');

	app.put('/cookies_test', function(req,resp,next) {
		// 3 different set-cookie headers:
		resp.cookie('name', 'netanel', { domain: '.example.com', path: '/admin', secure: true });
		resp.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
		resp.cookie('cart', { items: [1,2,3] }, { maxAge: 500000 });
		resp.send('');
		next();
	});

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					method		: 'PUT',
					path		: '/cookies_test',
					headers		: {host : 'www.somehost.com'}
			 	};
	var req = http.get(opts, function (resp) {
		if(resp.headers['set-cookie'].length !== 3) {
			console.log('FAILED - expected 3 set-cookies.');
		} else {
			//checking cookies path's (including default '/' path):
			var foundPaths = 0;
			for (var i = 0 ; i < 3 ; i++) {
				if (resp.headers['set-cookie'][i].indexOf('path=') !== -1) {
					foundPaths++;
				}
			}
			if (foundPaths === 3) {
				console.log('SUCCESS');
			} else {
				console.log('FAILED - cookies have no path.');
			}
		}
	});
}


function testSingleSend() {
	logTest('Checking that only the first matching send() occurs.');

	app.use('/testSingle', function (req,resp,next) {
		resp.set('use',1);
		resp.send('use1');
		next();
	});
	app.use('/testSingle/a', function (req,resp,next) {
		resp.set('use',2);
		resp.send('use2');
		next();
	});
	app.get('/testSingle', function (req,resp,next) {
		resp.set('use',3);
		resp.send('use3');
		next();
	});

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					path		: '/testSingle/a/somefile.php',  /* all 3 routes match */
					headers		: {host : 'www.somehost.com'}
			 	};
	var req = http.get(opts, function (resp) {
		if(resp.headers['use'] == 1) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED - sent ' + resp.headers['use'] + ' messages.');
		}
	});
}


function testMultipleNonSend() {
	logTest('Checking that all matching routes are taken in case they don\'t send()/json().');

	var takenRoutes = 0;

	app.use('/testMultiple', function (req,resp,next) {
		takenRoutes++;
		next();
	});
	app.use('/testMultiple/a', function (req,resp,next) {
		takenRoutes++;
		next();
	});
	app.get('/testMultiple', function (req,resp,next) {
		takenRoutes++;
		next();
	});

	var opts = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					path		: '/testMultiple/a/somefile.php',  /* all 3 routes match */
					headers		: {host : 'www.somehost.com'}
			 	};
	var req = http.get(opts, function (resp) {
		if(takenRoutes == 3) {
			console.log('SUCCESS');
		} else {
			console.log('FAILED. took ' + takenRoutes + '/3 routes.');
		}
	});
}


function logTest(description) {
	console.log('\n-------------------------------------------------------------------------');
	console.log(description);
	console.log('-------------------------------------------------------------------------');
}

function test() {
	var TESTS = [];
	var i;
	setupServer(PORT);
	http.globalAgent.maxSockets = 100; //for overlapping tests

	console.log('\n');

	TESTS.push(testExistingResourceRequest); 
	TESTS.push(testNonExistingResourceRequest);
	TESTS.push(testNonHttpRequest);
	TESTS.push(testDirectoryTraversal);
	TESTS.push(testJsonPut);
	TESTS.push(testUrlencodePost);
	TESTS.push(testBodyParseDelete);
	TESTS.push(testIllegalMethod);
	TESTS.push(testParsing);
	TESTS.push(testSetCookie);
	TESTS.push(testSingleSend);
	TESTS.push(testMultipleNonSend);

	setTimeout(function () {
		console.log('\n\n#########################################################################');
		console.log('#########################################################################');
	}, 100);
	
	for(i=0 ; i<TESTS.length ; i++) {
		setTimeout(TESTS[i],i*3000+200);
	}

	setTimeout(function () {
		console.log('\n#########################################################################');
		console.log('#########################################################################');
		console.log('\nCheck that there are no FAILED tests!\n');
	}, i*3000+200);
}

test();
