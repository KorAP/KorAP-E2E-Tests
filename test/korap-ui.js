const { doesNotMatch } = require('assert');
const { beforeEach } = require('mocha');
const puppeteer = require('puppeteer')
var chai = require('chai');
var should = chai.should();
var assert = chai.assert;
const KORAP_URL = process.env.KORAP_URL || "http://localhost:64543";
const KORAP_LOGIN = process.env.KORAP_LOGIN || "user2";
const KORAP_PWD = process.env.KORAP_PWD || "password2";
const KORAP_QUERIES = 'geht, [orth=geht & cmc/pos=VVFIN]'
const korap_rc = require('../lib/korap_rc.js').new(KORAP_URL);

describe('Running KorAP UI end-to-end tests on ' + KORAP_URL, () => {
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
            const login_result = await korap_rc.login(page, KORAP_LOGIN, KORAP_PWD + "*")
            login_result.should.be.false
        })).timeout(10000)

    it('Login into KorAP with correct credentials succeeds',
        (async () => {
            const login_result = await korap_rc.login(page, KORAP_LOGIN, KORAP_PWD)
            login_result.should.be.true
        })).timeout(10000)

    it('Can turn glimpse off',
        (async () => {
            await korap_rc.assure_glimpse_off(page)
        })).timeout(10000)

    const expected_hits = 724
    describe('Running searches that should have hits', () => {
        KORAP_QUERIES.split(/[;,] */).forEach((query, i) => {
            it('Search for "' + query + '" has hits',
                (async () => {
                    await korap_rc.assure_glimpse_off(page)
                    const hits = await korap_rc.search(page, query)
                    hits.should.be.above(0)
                })).timeout(20000)
        })
    })
    it('Logout works',
        (async () => {
            const logout_result = await korap_rc.logout(page)
            logout_result.should.be.true
        })).timeout(10000)

})