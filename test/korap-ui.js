const { doesNotMatch } = require('assert');
const { beforeEach } = require('mocha');
const puppeteer = require('puppeteer')
var chai = require('chai');
var should = chai.should();
var assert = chai.assert;
const KORAP_URL =  process.env.KORAP_URL || "http://localhost:64543";
const KORAP_LOGIN =  process.env.KORAP_LOGIN || "user2";
const KORAP_PWD = process.env.KORAP_PWD || "password2";
const KORAP_QUERIES = "geht"
// const korap_rc = require('../lib/korap_rc.js');

async function KorAPlogin(page, username, password) {
    await page.goto(KORAP_URL, { waitUntil: 'networkidle0' });
    const username_field = await page.$("body > aside > div > fieldset > form > input[type=text]")

    if (username_field != null) {
        await username_field.type(username);
        await page.keyboard.press("Tab")
        await page.keyboard.type(password)
        await page.keyboard.press("Enter")
    }

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    logout = await page.$("body > header > div > a[class=logout]")
    if (logout == null) {
        return false
    }

    let value = await page.evaluate(logout => logout.textContent, logout)
    if (!value.match(/(Abmelden|Logout)/)) {
        return false
    }
    return true
}

async function KorAPlogout(page) {
    const logout_button = await page.$("a[class=logout]")
    if (logout_button == null) {
        return false
    }
    await page.click("a[class=logout]")
    const username_field = await page.$("body > aside > div > fieldset > form > input[type=text]")
    assert.notEqual(username_field, null)
    return true
}

async function search(page, query) {
    const query_field = await page.$("body > header > form > div > input[name=q]")
    assert.notEqual(query_field, null)
    await query_field.type(query)
    await page.keyboard.press("Enter")
    await page.waitForNavigation();
    const total_results = await page.$("#total-results")
    assert.notEqual(total_results, null, "cannot find total results")
    const hits = Number(await page.evaluate(total_results => total_results.textContent, total_results))
    return hits
}

describe('Running KorAP UI tests on ' + KORAP_URL, () => {
    const screenshot = 'screenshot.png'

    before(async () => {
        browser = await puppeteer.launch()
        page = await browser.newPage()
    })

    after(async () => {
        await browser.close()
    })

    it('Login into KorAP with incorrect credentials fails',
        (async () => {
            const login_result = await KorAPlogin(page, KORAP_LOGIN, KORAP_PWD + "*")
            login_result.should.be.false
        })).timeout(10000)

    it('Login into KorAP with correct credentials succeeds',
        (async () => {
            const login_result = await KorAPlogin(page, KORAP_LOGIN, KORAP_PWD)
            login_result.should.be.true
        })).timeout(10000)

    const expected_hits = 724

    it('Search for "' + KORAP_QUERIES + '" has approx. ' + expected_hits + ' hits',
        (async () => {
            glimpse = await page.$("input[name=cutoff]")
            glimpse_value = await (await glimpse.getProperty('checked')).jsonValue()
            if (glimpse_value) {
                glimpse = await page.$("input[name=cutoff]")
                await page.click("#glimpse")
            }
            const hits = await search(page, KORAP_QUERIES)
            await page.screenshot({ path: screenshot })
            hits.should.be.approximately(expected_hits, 10)
        })).timeout(20000)

    it('Logout works',
        (async () => {
            const logout_result = await KorAPlogout(page)
            logout_result.should.be.true
        })).timeout(10000)

})