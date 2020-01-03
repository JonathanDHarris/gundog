const express  = require('express');
const app      = express();
const request = require('request');
const http = require('http');
const cheerio = require('cheerio');
const url = require('url');
const hashFnv32a = require('./scripts/hashFnv32a.js');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.set('view engine', 'ejs');

let config;
let SERVER_PORT;
if (process.env.NODE && ~process.env.NODE.indexOf("heroku")) {
    config = require('./config.heroku.json');
    SERVER_PORT = process.env.PORT || 5000;
} else {
    config = require('./config.local.json');
    SERVER_PORT = config.hostPort;
}

const SERVER_EXTERNAL_ADDRESS = config.externalAddress;
const PROTOCOL = config.protocol;
app.set('port', SERVER_PORT);

let cookies;

const makeResponseBody = (res, body, reqUrl) => {
    $ = cheerio.load(body);

    let responseBody = '';
    
    const usableElements = 'p, h1, h2, h3, ul, ol, figure, img';
    
    const numberElements = $(body).find(usableElements).length;
    
    // Print out elements like headers that might be useful
    // But only print out things like lists if we think we're in the main body of the page
    isPreAmble = true;
    preAmbleEmpty = true;
    preAmble = [];
    hashedContent = [];
    mainContent = [];
    
    for (let i = 0; i < numberElements; i++) {        
        element = $(body).find(usableElements).eq(i);

		if (cookies.hideImages === 'true') {
		 element.find('img').remove();
		}
		
        /* Don't want the attributes we're given, e.g. classes, stylings.  So remove them.
         * Keep ids since they are needed for tests to pass and for internal links. */
        if (element[0].attribs.id) {
            element[0].attribs = {
                id: element[0].attribs.id
            };
        } else {
            element[0].attribs = {};
        }
        
        if (isPreAmble) {
            isPreAmble = elementIsPreAmble(element[0])
        }
        
        if (isPreAmble) {
            preAmbleEmpty = false;
            let elementsToAdd = parseElement(element, i, reqUrl);
            
            elementsToAdd.forEach(el => {
                preAmble.push(el.toString());
            });
        }
        
        if (!isPreAmble) {
            let elementsToAdd = parseElement(element, i, reqUrl);
            
            elementsToAdd.forEach(el => {
                const hashedEl = hashFnv32a(el.toString());
                
                /* Don't add identical duplicates of an element.
                 * Could be a problem in some areas, but prevents
                 * repeating elements if there's a duplicate in the DOM
                 * e.g. if there is a mobile version of the content
                 * that the site expects to be hidden via javascript. */
                if (hashedContent.indexOf(hashedEl) < 0) {
                        hashedContent.push(hashedEl);
                        mainContent.push(el.toString());
                    };
                    
                });
        }
    };

	const templateData = {
		theme: getTheme(),
		sizing: getResponsiveSizing(),
		protocol: PROTOCOL,
		severExternalAddress: SERVER_EXTERNAL_ADDRESS,
		reqUrl,
		preAmbleEmpty,
		preAmble,
		content: mainContent
	};
	
	res.render('gundog', templateData);
};

const elementIsPreAmble = element => {
    // I've found that in practice most sites only use h1 for headers you actually want to see
    if (element.name === 'h1'
        || (element.name === 'p' && element.children[0] && element.children[0].type === 'text' && element.children[0].data.length > 3)) {
        return false;
    } else {
        return true;
    }
};

const parseElement = (element, i, reqUrl) => {
    let elementsToAdd;
            
    if (element[0].name === 'ul' || element[0].name === 'ol') {
        elementsToAdd = parseList(element, i);
    } else if (element.attr('aria-hidden')) {
        elementsToAdd = parseAriaHidden(element);
    } else {
        elementsToAdd = parseLinks(element, reqUrl);
    };
    
    return elementsToAdd;
};

const parseList = (element, i) => {
	const fistListItem = element.find('li').text().trim().split('\n')[0].substring(0, 15);
	const elementsToAdd = [];

    element.attr('id','list_' + i);
	element.attr('class', 'toggle-list');
    element.attr('style', 'display:none');
	
	const moreButton = $('<a> (show more...)</a>')
		.attr('id', 'button_' + i)
        .attr('onclick', 'toggleList(' + i + ')');
        
    elementsToAdd.push($('<ul><li>' + fistListItem + moreButton + '</li></ul>'));
    elementsToAdd.push(element);
    
    return elementsToAdd;
};

const parseAriaHidden = element => {
    element.attr('style', 'display:none');
    
    return [element];
};
	
const parseLinks = (element, reqUrl) => {    
    element.find('a').toArray().forEach(a => {
	  const href = a.attribs['href']
	  	  
      if (href && href[0]) {
	    const parsedUrl = new url.parse(reqUrl);
        const hostname = parsedUrl.hostname;
        const fullPath  = parsedUrl.href;
        let parentPath = fullPath.split('/');
        parentPath.pop();
        parentPath = parentPath.join('/');
		
        // Absolute link
        if (href.substring(0, 4) === 'http') {
			a.attribs['href'] = PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/?gundog_url=' + href;
        } else if (href[0] === '#') {
            // pass
        }
        // Relative link
        else if (href[0] === '/') {
            a.attribs['href'] = PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/?gundog_url=http://' + hostname + href;
        } else {
            a.attribs['href'] = PROTOCOL + '://' + SERVER_EXTERNAL_ADDRESS + '/?gundog_url=' + parentPath + '/' + href;
        } 
      }
    });
        
    return [element];
};

const makeFailureResponseBody = (res, reqUrl) => {
    const templateData = {
		theme: getTheme(),
		sizing: getResponsiveSizing(),
		reqUrl
	};
	
	res.render('failure', templateData);
};

const makeIndexPage = res => {
	const templateData = {
		theme: getTheme(),
		sizing: getResponsiveSizing()
	};
	
	res.render('index', templateData);
};

const makePreferencesPage = res => {
	const templateData = {
		theme: getTheme(),
		sizing: getResponsiveSizing(),
		cookies
	};
	
	res.render('preferences', templateData);
}


const getTheme = () => {
    // Thanks to http://bettermotherfuckingwebsite.com for bulk of the styling
    cookies = cookies || [];
    
    if (cookies.theme === 'dark') {
        return '<link rel="stylesheet" type="text/css" href="static/style/theme_dark.css">';
    } else {
        return '<link rel="stylesheet" type="text/css" href="static/style/theme_default.css">';
    }
}

const getResponsiveSizing = () => {
    returnString = '<link rel="stylesheet" type="text/css" href="static/style/responsive_sizing.css">';
    returnString += '<meta name="viewport" content="width=device-width, initial-scale=1">';
    
    return returnString;
}

app.all("/*", (req, res) => {
    cookies = req.cookies;
    
    let reqUrl = req.url.substring(1);
    
    if (reqUrl.length === 0) {
        makeIndexPage(res);
        return;
    }
    
    if (reqUrl === 'setHideImages') {
        res.cookie('hideImages', 'true');
        cookies.hideImages = 'true';
        makePreferencesPage(res);
        return;
    }
    
    if (reqUrl === 'setShowImages') {
        res.cookie('hideImages', 'false');
        cookies.hideImages = 'false';
        makePreferencesPage(res);
        return;
    }
 
    if (reqUrl === 'setThemeLight') {
        res.cookie('theme', 'light');
        cookies.theme = 'light';
        makePreferencesPage(res);
        return;
    }
    
    if (reqUrl === 'setThemeDark') {
        res.cookie('theme', 'dark');
        cookies.theme = 'dark';
        makePreferencesPage(res);
        return;
    }
       
    if (reqUrl === 'preferences') {
        makePreferencesPage(res);
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
    
    const decodedReqUrl = decodeURIComponent(reqUrl);

    request(decodedReqUrl, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            makeResponseBody(res, body, reqUrl);
        } else {
		    makeFailureResponseBody(res, decodedReqUrl);
        }
    })
});

app.listen(app.get('port'), () => {
  console.log('Node app is running on port', app.get('port'));
});