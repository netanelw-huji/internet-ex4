var miniExpress = require('./miniExpress');
var http = require('http');

var HOST = 'localhost';
var PORT = 3000;
var STATUS_CODE_REGEX = /\d{3}/;


console.log('\n');

var app = miniExpress();
app.use(miniExpress.static(__dirname + '/www'));
app.listen(PORT);


var N = 1000;
http.globalAgent.maxSockets = N;

setTimeout( function () {
	console.log('\n#########################################################################');
	console.log('#########################################################################');
	console.log('\n-------------------------------------------------------------------------');
	console.log('Trying to serve ' + N + ' request simultanously:');
	console.log('-------------------------------------------------------------------------');

	var successfulRequests = 0;

	var req = 	{	httpVersion : '1.1',
					hostname 	: HOST,
					port 		: PORT,
					path		: '/profile.html',
					headers		: {host : 'www.somehost.com', connection: 'close'}
			 	};

	function requestFile() {
		http.get(req, function (resp) {
			successfulRequests++;
		}).on('error', function (e) {});
	}

	for(var i=0 ; i<N ; i++) {
		setTimeout(requestFile,0*i); // <--------------------- change 0 to 2 for checking with 2ms gaps!
	}

	setTimeout(function () {
		console.log('The server was able to serve ' + successfulRequests + '/' + N + ' concurrent requests.');
		console.log('Server didn\'t crash!');
		console.log('You can test with non-zero gaps between requests (i.e.: 2) by changing\n' + 
					'the \'0\' in the loop above to see a huge boost in utilization.');
		console.log('\n#########################################################################');
		console.log('#########################################################################');
		console.log('\n');
	}, 5000);
},200);
