var express  = require('express');
var app      = express();
var request = require('request');
var http = require('http');
var cheerio = require('cheerio');
var url = require('url');
var config = require('./config.json');
var hashFnv32a = require('./scripts/hashFnv32a.js');
var cookieParser = require('cookie-parser')
app.use(cookieParser());

var SERVER_IP_ADDRESS = process.env.OPENSHIFT_NODEJS_IP || config.hostAddress;
var SERVER_PORT = process.env.OPENSHIFT_NODEJS_PORT || config.hostPort;
var SERVER_EXTERNAL_ADDRESS = config.externalAddress;
var PROTOCOL = config.protocol;

function makeResponseBody(body) {
    $ = cheerio.load(body);

    var responseBody = '';

    responseBody += '<html><head><title>Gundog</title>';
    responseBody += getTheme();
    responseBody += getResponsiveSizing();
    responseBody += ' <script src="' + PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/static/scripts/toggleList.js"></script>';
    responseBody += ' <script src="' + PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/static/scripts/togglePreAmble.js"></script>';
    responseBody += '</head><body><div id="gundog-div">';
    
    responseBody += '<div style="text-align:center"><a id="gunDogHome" href="gun_dog_home">Gun Dog Home</a>&nbsp;&nbsp;&nbsp;<a id="closeGunDog" href="">Close Gun Dog</a></div></br></br>';
    
    var usable_elements = 'p, h1, h2, h3, ul, ol';
    
    var number_elements = $(body).find(usable_elements).length;
    
    // Print out elements like headers that might be useful
    // But only print out things like lists if we think we're in the main body of the page
    isPreAmble = true;
    preAmbleEmpty = true;
    preAmble = '';
    hashedContent = [];
    mainContent = [];
    
    for (var i = 0; i < number_elements; i++) {        
        element = $(body).find(usable_elements).eq(i);
        // Don't want the attributes we're given, e.g. classes, ids, stylings.  So remove them.
        element[0].attribs = {};
        
        if (isPreAmble) {
            isPreAmble = elementIsPreAmble(element[0])
        }
        
        if (isPreAmble) {
            preAmbleEmpty = false;
            var elementsToAdd = parseElement(element, i);
            
            elementsToAdd.forEach(function(el) {
                preAmble += el;
            });
        }
        
        if (!isPreAmble) {
            var elementsToAdd = parseElement(element, i);
            
            elementsToAdd.forEach(function(el) {
                var hashedEl = hashFnv32a(el.toString());
                
                /* Don't add identical duplicates of an element.
                   Could be a problem in some areas, but prevents
                   repeating elements if there's a duplicate in the DOM
                   e.g. if there is a mobile version of the content
                   that the site expects to be hidden via javascript. */
                if (hashedContent.indexOf(hashedEl) < 0) {
                        hashedContent.push(hashedEl);
                        mainContent.push(el.toString());
                    };
                    
                });
        }
    };

    if (!preAmbleEmpty) {
        var togglePreAmbleButton = $('<button>Show site navigation</button>')
            .attr('id', 'togglePreAmbleButton')
            .attr('onclick', 'togglePreAmble()');
        responseBody += togglePreAmbleButton
        responseBody += '<div id="gunDogPreAmble" style="display:none">';
        responseBody += preAmble;
        responseBody += '</div>';
    }
    mainContent.forEach(function(el) {
        responseBody += el;
    });
    responseBody += '</div></body></html>';
    
    return responseBody;
};

function elementIsPreAmble(element) {
    // I've found that in practice most sites only use h1 for headers you actually want to see
    if (element.name === 'h1'
        || (element.name === 'p' && element.children[0] && element.children[0].type === 'text' && element.children[0].data.length > 3)) {
        return false;
    } else {
        return true;
    }
};

function parseElement(element, i) {
    var elementsToAdd;
            
    if (element[0].name === 'ul' || element[0].name === 'ol') {
        elementsToAdd = parseList(element, i);
    } else if (element.attr('aria-hidden')) {
        elementsToAdd = parseAriaHidden(element);
    } else {
        elementsToAdd = [element];
    };
    
    return elementsToAdd;
};

function parseList(element, i) {
    var elementsToAdd = [];
    var label;
    if (element.attr('aria-label')) {
        label = element.attr('aria-label');
    } else if (element.attr('id')) {
        label = element.attr('id');
    } else if (element.attr('class')) {
        label = element.attr('class');
    } else {
        label = 'List';
    }
    var buttonId = 'button_' + i;
    var buttonData = 'Show ' + label;
    var button = $('<button>Show '+ label + '</button>')
        .attr('id', buttonId)
        .attr('onclick', 'toggleList(' + i + ')');

    element.attr('id','list_' + i);
    element.attr('style', 'display:none');
        
    elementsToAdd.push(button);
    elementsToAdd.push($('</br>'));
    elementsToAdd.push(element);
    
    return elementsToAdd;
};

function parseAriaHidden(element) {
    element.attr('style', 'display:none');
    
    return [element];
};

function parseLinks(responseBody, reqUrl) {
    var hostname;
    var fullPath;  // Path to the resource, example.com/directory/file.html
    var parentPath;  // Path to the resource parent directory, example.com/directory

    if (reqUrl) {
        var parsedUrl = new url.parse(reqUrl);
        hostname = parsedUrl.hostname;
        fullPath  = parsedUrl.href;
        parentPath = fullPath.split('/');
        parentPath.pop();
        parentPath = parentPath.join('/');
    }
    
    $ = cheerio.load(responseBody);
    
    $('a').each(function(index, value) {
      var a = $(this);
      
      if (a.attr('href') && a.attr('href')[0]) {
        var href = a.attr('href');
        // Absolute link
        if (href.substring(0, 4) === 'http') {
            a.attr('href', PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/?gundog_url=' + href);
        } else if (href[0] === '#') {
            a.attr('href', href);
        }
        // Relative link
        else if (href[0] === '/') {
            a.attr('href',PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/?gundog_url=http://' + hostname + href);
        } else {
            a.attr('href',PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/?gundog_url=' + parentPath + '/' + href);
        } 
      }
    });
    
    $('#gunDogHome').attr('href', PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/');
    $('#closeGunDog').attr('href', reqUrl);
    $('#preferences').attr('href', '/preferences');
    $('#setThemeLight').attr('href', '/setThemeLight');
    $('#setThemeDark').attr('href', '/setThemeDark');
    $('#setShowImages').attr('href', '/setShowImages');
    $('#setHideImages').attr('href', '/setHideImages');
    $('#setViewportNormal').attr('href', '/setViewportNormal');
    $('#setViewportMobile').attr('href', '/setViewportMobile');
    
    return $.html();
};

function hideImages(responseBody) {
    $ = cheerio.load(responseBody);
    $('img').remove();
    return $.html();
};

function makeFailureResponseBody(reqUrl) {
    
    var response = '';
    
    response += '<html><head><title>Gundog</title>' + getTheme() + getResponsiveSizing() + '</head><body>';
    
    response += '<div id="problem-div">';
    response += '<p>Gundog experienced a problem.</p>';
    response += '<p>You can try the requested url yourself:</p>';
    response += '<a href="' + reqUrl + '">' + reqUrl + '</a>';
    response += '</div>';
    
    response += '</body></html>';
    
    return response;
};

function makeIndexPage() {
    var response = '';
    
    response += '<html><head><title>Gundog</title>' + getTheme() + getResponsiveSizing() + '</head><body></br></br></br><div style="margin:0 auto" align=center> <h3>Gundog</h3><form action="/" method="GET"><input type="text" name="gundog_url" id="gundog-bar" value="" style="width: 95%;" autofocus /><br /></form></div></br></br></br><p>Give gundog a website address and it will return a stripped down version of the site.</p><p>Gundog was created for use with sites containing a lot of banners and scripts that made browsing tedious and for mobile browsing.</p><p>It will work well with pages containing a lot of text such as articles but not so well on other pages such as news front pages.</p></br></br></br><div style="text-align:center"><a id="preferences" href="">Preferences</a></div></body></html>'
    
    return response;
};

function makePreferencesPage() {
    var response = '';
    
    response += '<html><head><title>Gundog</title>' + getTheme() + getResponsiveSizing() + '</head><body>';
    
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
    // Thanks to http://bettermotherfuckingwebsite.com for bulk of the styling
    cookies = cookies || [];
    
    if (cookies.theme === 'dark') {
        return '<link rel="stylesheet" type="text/css" href="static/style/theme_dark.css">';
    } else {
        return '<link rel="stylesheet" type="text/css" href="static/style/theme_default.css">';
    }
}

function getResponsiveSizing() {
    returnString = '<link rel="stylesheet" type="text/css" href="static/style/responsive_sizing.css">';
    returnString += '<meta name="viewport" content="width=device-width, initial-scale=1">';
    
    return returnString;
}

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
    
    if (reqUrl.substring(0,7) === 'static/'){
        reqUrl =  __dirname + '/' + reqUrl;
        res.sendFile(reqUrl);
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
            res.write(responseBody);
        }
        res.send();
    })
});

console.log(SERVER_IP_ADDRESS, SERVER_PORT);
app.listen(SERVER_PORT, SERVER_IP_ADDRESS, function () {
  console.log( "Listening on " + SERVER_IP_ADDRESS + ", port " + SERVER_PORT );
});