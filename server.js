var express  = require('express');
var app      = express();
var request = require('request');
var http = require('http');
var cheerio = require('cheerio');
var url = require('url');
var config = require('./config.json');
var cookieParser = require('cookie-parser')
app.use(cookieParser());

var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || config.hostAddress;
var server_port = process.env.OPENSHIFT_NODEJS_PORT || config.hostPort;
var server_exeternal_address = config.externalAddress;

function makeResponseBody(body) {
    $ = cheerio.load(body);

    var responseBody = '';

    responseBody += '<html><head><title>Gundog</title>' + getTheme() + '</head><body>';
    
    responseBody += '<div style="text-align:center"><a id="gunDogHome" href="gun_dog_home">Gun Dog Home</a>&nbsp;&nbsp;&nbsp;<a id="closeGunDog" href="">Close Gun Dog</a></div></br></br>';
    
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
    
    return responseBody;
}

function parseLinks(responseBody, reqUrl) {
    var linkColour;
    
    // Must be set here because you can't do inline stlyes on psuedo-selectors
    if (cookies && cookies.theme) {
        if (cookies.theme === 'dark') {
            linkColour = 'yellow';
        }
        else {
            linkColour = 'blue';
        }
    }
    
    var parsed_url;
    var domain;
    var protocol;
    
    if (reqUrl) {
        parsed_url = new url.parse(reqUrl);
        domain =  parsed_url.hostname; 
        protocol = parsed_url.protocol;
    }
    
    $ = cheerio.load(responseBody);
    
    $('a').each(function(i, element){
      var a = $(this);
      
      a.css('color', linkColour);
      
      if (a.attr('href') && a.attr('href')[0]) {
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
      }
    });
    
    $('#gunDogHome').attr('href', 'http://' + server_exeternal_address + '/');
    $('#closeGunDog').attr('href', reqUrl);
    $('#setThemeLight').attr('href', '/setThemeLight');
    $('#setThemeDark').attr('href', '/setThemeDark');
    
    return $.html();
};

function makeFailureResponseBody(body, reqUrl) {
    
    var responseBody = '';
    
    responseBody += '<html><head><title>Gundog</title>' + getTheme() + '</head><body>';
    
    responseBody += '<p>Gundog experienced a problem.</p>';
    responseBody += '<p>You can try the requested url yourself:</p>';
    responseBody += '<a href="' + reqUrl + '">' + reqUrl + '</a>';
    
    responseBody += '</body></html>';
    
    return responseBody;
};

function makeIndexPage() {
    var responseBody = '';
    
    responseBody += '<html><head><title>Gundog</title>' + getTheme() + '</head><body></br></br></br><div style="margin:0 auto" align=center> <h3>Gundog</h3><form action="/" method="GET"><input type="text" name="gundog_url" value="" style="width: 600px;" /><br /></form></div></br></br></br><p>Give gundog a website address and it will return a stripped down version of the site.</p><p>Gundog was created for use with sites containing a lot of banners and scripts that made browsing tedious and for mobile browsing.</p><p>It will work well with pages containing a lot of text such as articles but not so well on other pages such as news front pages.</p></br></br></br><div style="text-align:center"><a id="setThemeLight" href="">Light Theme</a>&nbsp;&nbsp;&nbsp;<a id="setThemeDark" href="">Dark Theme</a></div></body></html>'
    
    return responseBody;
};

function getTheme() {
    // Thanks to http://bettermotherfuckingwebsite.com for bluk of the styling
    var theme = '';
    
    if (cookies && cookies.theme) {
        if (cookies.theme === 'dark') {
            theme = '<style type="text/css">body{margin:40px auto;max-width:650px;line-height:1.6;font-size:16px;color:white;background-color:black;padding:0 10px}h1,h2,h3{line-height:1.2};</style>';
        }
        else {
            theme = '<style type="text/css">body{margin:40px auto;max-width:650px;line-height:1.6;font-size:16px;color:#444;padding:0 10px}h1,h2,h3{line-height:1.2}</style>';
        }
    }
    
    return theme;
};

app.all("/*", function(req, res) {
    cookies = req.cookies;
    
    var reqUrl = req.url.substring(1);
 
    if (reqUrl === 'setThemeLight') {
        res.cookie('theme', 'light');
        cookies.theme = 'light';
        res.write(parseLinks(makeIndexPage()));
        res.send();
        return;
    };
    
    
    if (reqUrl === 'setThemeDark') {
        res.cookie('theme', 'dark');
        cookies.theme = 'dark';
        res.write(parseLinks(makeIndexPage()));
        res.send();
        return;
    };
    
    if (reqUrl.substring(0,12) === '?gundog_url='){
        reqUrl = req.url.substring(13);
    };
    
    reqUrl = decodeURIComponent(reqUrl);
    
    if(reqUrl.length > 0){
        res.writeHead(200, {'Content-Type': 'text/html'});
    
        request(reqUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var responseBody = makeResponseBody(body);
                res.write(parseLinks(responseBody, reqUrl));            }
            else {
                var responseBody = makeFailureResponseBody(body, reqUrl);
                res.write(parseLinks(responseBody));
            }
            res.send();
        })
    }
    else {
        res.write(parseLinks(makeIndexPage()));
        res.send();
    }
});

console.log(server_ip_address, server_port);
app.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", server_port " + server_port )
});