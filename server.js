var express  = require('express');
var app      = express();
var request = require('request');
var http = require('http');
var cheerio = require('cheerio');
var url = require('url');
var config = require('./config.json');

var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || config.hostAddress;
var server_port = process.env.OPENSHIFT_NODEJS_PORT || config.hostPort;
var server_exeternal_address = config.externalAddress;

function makeResponseBody(body, reqUrl) {
    
    var parsed_url = new url.parse(reqUrl);
    var domain =  parsed_url.hostname; 
    var protocol = parsed_url.protocol;
    
    $ = cheerio.load(body);

    var responseBody = '';
    
    // Thanks to http://bettermotherfuckingwebsite.com for the styles
    responseBody += '<html><head><title>Gundog</title><style type="text/css">body{margin:40px auto;max-width:650px;line-height:1.6;font-size:16px;color:#444;padding:0 10px}h1,h2,h3{line-height:1.2}</style></head><body>';
    
    responseBody += '<div style="text-align:center"><a id="closeGunDog" href="">Close Gun Dog</a></div></br></br>';
    
    var number_p = $(body).find('p,h1,h2,h3').length;
    
    for (var i = 0; i < number_p; i++) {
        
        paragraph = $(body).find('p,h1,h2,h3').eq(i).html();
        
        if (paragraph.length > 20) {
        
            responseBody += paragraph;
            responseBody += '</br>';
            responseBody += '</br>';
        }
    };
    
    responseBody += '</body></html>';
    
    $ = cheerio.load(responseBody);
    
    $('a').each(function(i, element){
      var a = $(this);
      
      // Relative link
      if (a.attr('href')[0] === '/') {
          a.attr('href',function(i,v) {
            return 'http://' + server_exeternal_address + '/' + domain + v;
          });
      }
      else {
         a.attr('href',function(i,v) {
            return 'http://' + server_exeternal_address + '/' + v;
          });
      }
    });
    
    
    $('#closeGunDog').attr('href', reqUrl);
    
    return $.html();
};

function makeFailureResponseBody(body, reqUrl) {
    
    var responseBody = '';
    
    // Thanks to http://bettermotherfuckingwebsite.com for the styles
    responseBody += '<html><head><title>Gundog</title><style type="text/css">body{margin:40px auto;max-width:650px;line-height:1.6;font-size:16px;color:#444;padding:0 10px}h1,h2,h3{line-height:1.2}</style></head><body>';
    
    responseBody += '<p>Gundog experienced a problem.</p>';
    responseBody += '<p>You can try the requested url yourself:</p>';
    responseBody += '<a href="' + reqUrl + '">' + reqUrl + '</a>';
    
    responseBody += '</body></html>';
    
    return responseBody;
};

app.all("/*", function(req, res) {
    var reqUrl = req.url.substring(1);
    
    if (reqUrl.substring(0,12) === '?gundog_url='){
        reqUrl = req.url.substring(13);
    };
    
    reqUrl = decodeURIComponent(reqUrl);
    
    if(reqUrl.length > 0){
        res.writeHead(200, {'Content-Type': 'text/html'});
    
        request(reqUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var responseBody = makeResponseBody(body, reqUrl);
                res.write(responseBody);            }
            else {
                var responseBody = makeFailureResponseBody(body, reqUrl);
                res.write(responseBody);
            }
            res.send();
        })
    }
    else {
        res.sendfile('index.html');
    }
});

console.log(server_ip_address, server_port);
app.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", server_port " + server_port )
});