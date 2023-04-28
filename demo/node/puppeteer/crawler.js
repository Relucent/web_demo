/**
 * Puppeteer(中文翻译” 木偶”) 是 Google Chrome 团队官方的无界面（无头或无脑 Headless）Chrome 工具。.<br>
 * 它是一个 Node 库，提供了一个高级的 API 来控制 DevTools 协议上的无头版 Chrome。 <br>
 * Github：https://github.com/puppeteer/puppeteer <br>
 * node crawler.js "https://www.baidu.com/"
 */

const puppeteer = require('puppeteer');
const path = require('path');
const options = process.argv;

(async () => {

    const url = options[2];
    console.log(url)

    const browser = await puppeteer.launch({headless:'new'});

    try {

        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('.s_form');
        const body = await page.evaluate(() => {
            return document.documentElement.outerHTML;
        });

        console.log(body)
    } finally {
        await browser.close();
    }
})();
