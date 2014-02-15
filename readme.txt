1. Hard parts: 	refactoring ex3. it would've been easier if we we're told to 
                implement miniHttp similar to Node's http in ex3 so we could
                focus mainly on miniExpress in this exercise. 

2. Fun parts:	Getting the list example to work on the 3rd try! :)

3. 


//  single thread - when it's stuck in an infinite loop, no request will be handled
//  and no callback will get executed.
app.use('/hello/hacker', function (req,resp,next) {
    while(1);
});


//	disallowing connections to the server is another way to cause DoS.
app.use('/hello/hacker', function (req,resp,next) {
   	var http666 = require('http');
	http666.globalAgent.maxSockets = 0;   
});


- both methods were tested and indeed cause DoS.

In order to make sure these functions will get called, we need the request to hit 
the malicious route. we can simply send a request using that route to the server,
perhaps with additional fake path so it would probably won't hit a static route,
and reach our malicious route (i.e. [host:port]/hello/hacker/some/malicious/route.tar).



(another method is referring to 'this', which depends on implementation. in mine
for example, it will refer to a Route object. changing it's regexp to '.*' for example 
will match all request, and can hijack -some- of them (depending on the location of the
malicious route in the routes list).
Referring to 'app' can also be possible, but requires knowledge of the source code, such
as the name of the application, etc.
The attacker can also make the server create and handle a huge amount of bogus requests,
or handle a large sync. fs task such as writing a huge file...)




