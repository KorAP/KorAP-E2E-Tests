const puppeteer = require('puppeteer-extra');
puppeteer.use(require('puppeteer-extra-plugin-user-preferences')({
    userPrefs: {
        safebrowsing: {
            enabled: false,
            enhanced: false
        }
    }
}));
const chai = require('chai');
const { afterEach } = require('mocha');
const { doesNotMatch } = require('assert');
const { log } = require('console');
const assert = chai.assert;
const should = chai.should();
var slack = null;

const KORAP_URL = process.env.KORAP_URL || "http://localhost:64543";
const KORAP_LOGIN = 'KORAP_LOGIN' in process.env ? process.env.KORAP_LOGIN : "user2"
const KORAP_PWD = process.env.KORAP_PWD || "password2";
const KORAP_QUERIES = process.env.KORAP_QUERIES || 'geht, [orth=geht & cmc/pos=VVFIN]'
const korap_rc = require('../lib/korap_rc.js').new(KORAP_URL)

const slack_webhook = process.env.SLACK_WEBHOOK_URL;

if (slack_webhook) {
    slack = require('slack-notify')(slack_webhook);
}

function ifConditionIt(title, condition, test) {
    return condition ? it(title, test) : it.skip(title + " (skipped)", test)
}

describe('Running KorAP UI end-to-end tests on ' + KORAP_URL, () => {

    before(async () => {
        browser = await puppeteer.launch({
            headless: "new",
        })
        page = await browser.newPage()
        await page.setViewport({
            width: 1280,
            height: 768,
            deviceScaleFactor: 1,
          });
        console.log("Browser version: " + await browser.version() + " started")
    })

    after(async () => {
        await browser.close()
    })

    afterEach(async function () {
        if (this.currentTest.state == "failed") {
            await page.screenshot({path: "failed_" + this.currentTest.title.replaceAll(/[ &\/]/g, "_") + '.png'});
            if (slack) {
                slack.alert({
                    text: 'Test on ' + KORAP_URL + ' failed: ' + this.currentTest.title,
                })
            }
        }
     })

    it('KorAP UI is up and running',
        (async () => {
            await await page.goto(KORAP_URL);
            const query_field = await page.$("#q-field")
            assert.isNotNull(query_field, "#q-field not found. Kalamar not running?");
        }))


    ifConditionIt('Login into KorAP with incorrect credentials fails',
        KORAP_LOGIN != "",
        (async () => {
            const login_result = await korap_rc.login(page, KORAP_LOGIN, KORAP_PWD + "*")
            login_result.should.be.false
        }))

    ifConditionIt('Login into KorAP with correct credentials succeeds',
        KORAP_LOGIN != "",
        (async () => {
            const login_result = await korap_rc.login(page, KORAP_LOGIN, KORAP_PWD)
            login_result.should.be.true
        }))

    it('Can turn glimpse off',
        (async () => {
            await korap_rc.assure_glimpse_off(page)
        }))

    describe('Running searches that should have hits', () => {

        before(async () => { await korap_rc.login(page, KORAP_LOGIN, KORAP_PWD) })

        KORAP_QUERIES.split(/[;,] */).forEach((query, i) => {
            it('Search for "' + query + '" has hits',
                (async () => {
                    await korap_rc.assure_glimpse_off(page)
                    const hits = await korap_rc.search(page, query)
                    hits.should.be.above(0)
                })).timeout(20000)
        })
    })

    ifConditionIt('Logout works',
        KORAP_LOGIN != "",
        (async () => {
            const logout_result = await korap_rc.logout(page)
            logout_result.should.be.true
        }))

})
