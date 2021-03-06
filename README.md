# Gundog

Give gundog a website address and it will return a stripped down version of the site.

Gundog was created for use with sites containing a lot of banners and scripts that made browsing tedious and for mobile browsing.

It will work well with pages containing a lot of text such as articles but not so well on other pages such as news front pages.

Here is an example of a webpage without gundog
![alt text](https://github.com/JonathanDHarris/gundog/blob/master/documentation_images/without_example.png "Example website without gundog")

...and here is the same page with gundog
![alt text](https://github.com/JonathanDHarris/gundog/blob/master/documentation_images/with_example.png "The same website with gundog")

You can host your own gundog server locally, or use https://gundog.herokuapp.com

The heroku version uses the following buildpack:
[https://github.com/jontewks/puppeteer-heroku-buildpack](https://github.com/jontewks/puppeteer-heroku-buildpack)

**Testing**

Tests are run using [TestCafe](https://devexpress.github.io/testcafe/documentation/getting-started/)
 * Install TestCafe if required `npm install -g testcafe`
 * Check the test website is responding `testcafe chrome tests/pretests.js`
 * Run the tests `testcafe chrome tests/tests.js`