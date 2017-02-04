import { Selector } from 'testcafe';

var config = require('../config.json');
var SERVER_IP_ADDRESS = process.env.OPENSHIFT_NODEJS_IP || config.hostAddress;
var SERVER_PORT = process.env.OPENSHIFT_NODEJS_PORT || config.hostPort;
var SERVER_EXTERNAL_ADDRESS = config.externalAddress;

fixture `Home page`
    .page `http://${SERVER_EXTERNAL_ADDRESS}/`;

test('Page 1 loads over https', async t => {
    const gundogDivExists = Selector('#gundog-div').exists;
    const testP1Exists = Selector('#test-p-1').exists;
    await t
        .typeText('#gundog-bar', 'https://jonathandharris.github.io/gundog/test/page1.html')
        .pressKey('enter')
        .expect(gundogDivExists).ok()
        .expect(testP1Exists).ok();
});

test('Page 1 loads over http', async t => {
    const testP1Exists = Selector('#test-p-1').exists;
    await t
        .typeText('#gundog-bar', 'http://jonathandharris.github.io/gundog/test/page1.html')
        .pressKey('enter')
        .expect(testP1Exists).ok();
});

test('Page 1 loads with no protocol specified', async t => {
    const testP1Exists = Selector('#test-p-1').exists;
    await t
        .typeText('#gundog-bar', 'jonathandharris.github.io/gundog/test/page1.html')
        .pressKey('enter')
        .expect(testP1Exists).ok();
});

fixture `Links`
    .page `http://${SERVER_EXTERNAL_ADDRESS}/https://jonathandharris.github.io/gundog/test/page1.html`;

test('Page 1 links to Page 2 with relative link', async t => {
    const linkToPage2 = Selector('#link-to-page-2');
    const testP2Exists = Selector('#test-p-2').exists;
    await t
        .click(linkToPage2)
            .expect(testP2Exists).ok();
});

test('Page 1 links to Page 2 with realtive link with path', async t => {
    const linkToPage2 = Selector('#link-to-page-2b');
    const testP2Exists = Selector('#test-p-2').exists;
    await t
        .click(linkToPage2)
            .expect(testP2Exists).ok();
});

test('Page 1 links to Page 2 with external link', async t => {
    const linkToPage2 = Selector('#link-to-page-2c');
    const testP2Exists = Selector('#test-p-2').exists;
    await t
        .click(linkToPage2)
            .expect(testP2Exists).ok();
});

test('Gun Dog home link works', async t => {
    const linkToHomePage = Selector('#gunDogHome');
    const gundogBarExists = Selector('#gundog-bar').exists;
    await t
        .click(linkToHomePage)
            .expect(gundogBarExists).ok();
});

test('Close Gun Dog links to original page', async t => {
    const gundogDivExists = Selector('#gundog-div').exists;
    const closeGunDogLink = Selector('#closeGunDog');
    const testDiv1Exists = Selector('#test-p-1').exists;
    const testP1Exists = Selector('#test-p-1').exists;
    await t
        .click(closeGunDogLink)
            .expect(gundogDivExists).notOk()
            .expect(testDiv1Exists).ok();
});

fixture `Errors`
    .page `http://${SERVER_EXTERNAL_ADDRESS}/qwertyui`;

test('Broken urls report a problem to the user', async t => {
   const result =  Selector('#problem-div').exists;
   await t
        .expect(result).ok();
});
