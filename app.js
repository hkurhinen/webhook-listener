var http = require('http');
var fs = require('fs');
var url = require('url');
var crypto = require('crypto');
var config = require('config');
var exec = require('child_process').exec;

http.createServer(function (req, res) {
  if(req.method == 'POST'){
    var body = '';
    req.on('data', function(data) {
      body += data;
      
      if (body.length > 1e6)           // If body gets too large, kill the request.
        req.connection.destroy();      // (In case someone is doing naughty things like sending endless post requests)
    });
    req.on('end', function (){
      try {
        var post = JSON.parse(body);
        var repo = post.repository.name;
        if (typeof (config.repositories[repo]) === 'undefined') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Repository not found');
        } else {
          var conf = config.repositories[repo];
          var hmac = crypto.createHmac('sha1', conf.secret);
          hmac.update(body);
          var signature = 'sha1=' + hmac.digest('hex');
          
          if (signature !== req.headers['x-hub-signature']) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Invalid signature');
          } else {
            console.log('Signature is valid');
            exec(conf.script, function (err, stdout, stderr) {
              if (err)
                throw err;
            });
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('ok');
          }
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Unexpected error.');
      }
    });
  }
}).listen(config.port);
