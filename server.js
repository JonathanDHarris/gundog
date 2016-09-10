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
    
    var usable_elements = 'p, h1, h2, h3, ul, ol'
    
    var number_elements = $(body).find(usable_elements).length;
    
    // Print out elements like headers that might be useful
    // But only print out things like lists if we think we're in the main body of the page
    preAmbleFinished = false;
    
    for (var i = 0; i < number_elements; i++) {
        
        element = $(body).find(usable_elements).eq(i);
        
        if (preAmbleFinished === false) {
            preAmbleFinished = element[0].name === 'p'
        }
        
        if (preAmbleFinished || isPreAmble(element[0].name)) {
            responseBody += element;
        }
    };
    
    responseBody += '</body></html>';
    
    return responseBody;
}

function isPreAmble(tagName) {
    // I've found that in practice most sites only use h1 for headers you actually want to see
    return tagName === 'h1'
}

function parseLinks(responseBody, reqUrl) {
    var linkColour = 'blue';
    
    // Must be set here because you can't do inline stlyes on psuedo-selectors
    if (cookies && cookies.theme) {
        if (cookies.theme === 'dark') {
            linkColour = 'yellow';
        }
    }
    
    var domain;
    var reqHref;

    if (reqUrl) {
        var parsed_url = new url.parse(reqUrl);
        domain =  parsed_url.hostname; 
        reqHref  = parsed_url.href;
    }
    
    $ = cheerio.load(responseBody);
    
    $('a').each(function(index, value) {
      var a = $(this);
      
      a.css('color', linkColour);
      
      if (a.attr('href') && a.attr('href')[0]) {
        // Relative link
        if (a.attr('href')[0] === '/') {
            a.attr('href','http://' + server_exeternal_address + '/' + domain + a.attr('href'));
        } else if (a.attr('href')[0] === '#') {
            a.attr('href', a.attr('href'));
        } else {
            a.attr('href', 'http://' + server_exeternal_address + '/' + a.attr('href'));
        }
      }
    });
    
    $('#gunDogHome').attr('href', 'http://' + server_exeternal_address + '/');
    $('#closeGunDog').attr('href', reqUrl);
    $('#preferences').attr('href', '/preferences');
    $('#setThemeLight').attr('href', '/setThemeLight');
    $('#setThemeDark').attr('href', '/setThemeDark');
    $('#setShowImages').attr('href', '/setShowImages');
    $('#setHideImages').attr('href', '/setHideImages');
    
    return $.html();
};

function hideImages(responseBody) {
    $ = cheerio.load(responseBody);
    $('img').remove();
    return $.html();
};

function makeFailureResponseBody(reqUrl) {
    
    var response = '';
    
    response += '<html><head><title>Gundog</title>' + getTheme() + '</head><body>';
    
    response += '<p>Gundog experienced a problem.</p>';
    response += '<p>You can try the requested url yourself:</p>';
    response += '<a href="' + reqUrl + '">' + reqUrl + '</a>';
    
    response += '</body></html>';
    
    return response;
};

function makeIndexPage() {
    var response = '';
    
    response += '<html><head><title>Gundog</title>' + getTheme() + '</head><body></br></br></br><div style="margin:0 auto" align=center> <h3>Gundog</h3><form action="/" method="GET"><input type="text" name="gundog_url" value="" style="width: 600px;" /><br /></form></div></br></br></br><p>Give gundog a website address and it will return a stripped down version of the site.</p><p>Gundog was created for use with sites containing a lot of banners and scripts that made browsing tedious and for mobile browsing.</p><p>It will work well with pages containing a lot of text such as articles but not so well on other pages such as news front pages.</p></br></br></br><div style="text-align:center"><a id="preferences" href="">Preferences</a></div></body></html>'
    
    return response;
};

function makePreferencesPage() {
    var response = '';
    
    response += '<html><head><title>Gundog</title>' + getTheme() + '</head><body>';
    
    response += '<h3>Gundog Preferences</h3>';
    
    if (cookies && cookies.theme && cookies.theme === 'dark') {
       response += '<a id="setThemeLight" href="">Light Theme</a>';
    } else {
        response += '<a id="setThemeDark" href="">Dark Theme</a>';
    }
    
    response += '</br>' ;
    
    if (cookies.hideImages === 'true') {
       response += '<a id="setShowImages" href="">Show Images</a>';
    } else {
        response += '<a id="setHideImages" href="">Hide Images</a>';
    }
    
    response += '</br></br>'
    
    response += '<a id="gunDogHome" href="gun_dog_home">Back</a>';
    
    response += '</body></html>';
    
    return response;
}

function getTheme() {
    // Thanks to http://bettermotherfuckingwebsite.com for bluk of the styling
    var theme = '<style type="text/css">body{margin:40px auto;max-width:650px;line-height:1.6;font-size:16px;';
    
    if (cookies && cookies.theme) {
        if (cookies.theme === 'dark') {
            theme += 'color:white;background-color:black;';
        }
    } else {
        // Default
        theme += 'color:#444;'
    }
    theme += 'padding:0 10px}h1,h2,h3{line-height:1.2}</style>'
    
    return theme;
};

app.all("/*", function(req, res) {
    cookies = req.cookies;
    
    var reqUrl = req.url.substring(1);
    
    if (reqUrl.length === 0) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(parseLinks(makeIndexPage()));
        res.send();
        return;
    }
    
    if (reqUrl === 'setHideImages') {
        res.cookie('hideImages', 'true');
        cookies.hideImages = 'true';
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(parseLinks(makePreferencesPage()));
        res.send();
        return;
    }
    
    if (reqUrl === 'setShowImages') {
        res.cookie('hideImages', 'false');
        cookies.hideImages = 'false';
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(parseLinks(makePreferencesPage()));
        res.send();
        return;
    }
 
    if (reqUrl === 'setThemeLight') {
        res.cookie('theme', 'light');
        cookies.theme = 'light';
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(parseLinks(makePreferencesPage()));
        res.send();
        return;
    }
    
    if (reqUrl === 'setThemeDark') {
        res.cookie('theme', 'dark');
        cookies.theme = 'dark';
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(parseLinks(makePreferencesPage()));
        res.send();
        return;
    }
    
    if (reqUrl === 'preferences') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(parseLinks(makePreferencesPage()));
        res.send();
        return;
    }
    
    if (reqUrl.substring(0,12) === '?gundog_url='){
        reqUrl = req.url.substring(13);
    }
    
    if (reqUrl.substring(0, 4) !== 'http') {
        reqUrl = 'http%3A%2F%2F' + reqUrl;
    }
    
    reqUrl = decodeURIComponent(reqUrl);

    res.writeHead(200, {'Content-Type': 'text/html'});

    request(reqUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var responseBody = makeResponseBody(body);
            if (cookies && cookies.hideImages === 'true') {
                responseBody = hideImages(responseBody);
            }
            res.write(parseLinks(responseBody, reqUrl));
        } else {
            var responseBody = makeFailureResponseBody(reqUrl);
            res.write(parseLinks(responseBody));
        }
        res.send();
    })
});

console.log(server_ip_address, server_port);
app.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", server_port " + server_port )
});