const https = require('https');

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
const assert = chai.assert;
const should = chai.should();
var slack = null;

const KORAP_URL = process.env.KORAP_URL || "http://localhost:64543";
const KORAP_LOGIN = 'KORAP_USERNAME' in process.env ? process.env.KORAP_USERNAME : 'KORAP_LOGIN' in process.env ? process.env.KORAP_LOGIN : "user2"
const KORAP_PWD = process.env.KORAP_PWD || process.env.KORAP_PASSWORD || "password2";
const KORAP_QUERIES = process.env.KORAP_QUERIES || 'geht, [orth=geht & cmc/pos=VVFIN]'
const KORAP_MIN_TOKENS_IN_CORPUS = parseInt(process.env.KORAP_MIN_TOKENS_IN_CORPUS || "100000", 10);
const korap_rc = require('../lib/korap_rc.js').new(KORAP_URL)
const { sendToNextcloudTalk, ifConditionIt } = require('../lib/utils.js');

const slack_webhook = process.env.SLACK_WEBHOOK_URL;

if (slack_webhook) {
    slack = require('slack-notify')(slack_webhook);
}



describe('Running KorAP UI end-to-end tests on ' + KORAP_URL, () => {

    let browser;
    let page;
    

    before(async () => {
        browser = await puppeteer.launch({
            headless: "shell",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        })
        page = await browser.newPage()
        await page.setViewport({
            width: 1980,
            height: 768,
            deviceScaleFactor: 1,
        });
        
    })

    after(async function() {
        if (browser && typeof browser.close === 'function') {
            await browser.close();
        }
    })

    afterEach(async function () {
        if (this.currentTest.state == "failed") {
            // Only take screenshot if it's not one of the initial connectivity/SSL tests
            const initialTestTitles = [
                'should be reachable',
                'should have a valid SSL certificate'
            ];
            let screenshotPath = null;
            
            if (!initialTestTitles.includes(this.currentTest.title) && page) {
                screenshotPath = "failed_" + this.currentTest.title.replaceAll(/[ &\/]/g, "_") + '.png';
                await page.screenshot({ path: screenshotPath });
            }

            // Send notification to Slack
            if (slack) {
                try {
                    slack.alert({
                        text: `🚨 Test on ${KORAP_URL} failed: *${this.currentTest.title}*`,
                        attachments: [{
                            color: 'danger',
                            fields: [{
                                title: 'Failed Test',
                                value: this.currentTest.title,
                                short: false
                            }, {
                                title: 'URL',
                                value: KORAP_URL,
                                short: true
                            }]
                        }]
                    });
                } catch (slackError) {
                    console.error('Failed to send notification to Slack:', slackError.message);
                }
            }

            // Upload screenshot to Slack if available
            if (screenshotPath) {
                const slackToken = process.env.SLACK_TOKEN;
                if (slackToken) {
                    try {
                        const { WebClient } = require('@slack/web-api');
                        const fs = require('fs'); 
                        const web = new WebClient(slackToken);
                        const channelId = process.env.SLACK_CHANNEL_ID || 'C07CM4JS48H';

                        const result = await web.files.uploadV2({
                            channel_id: channelId,
                            file: fs.createReadStream(screenshotPath),
                            filename: screenshotPath,
                            title: `Screenshot: ${this.currentTest.title}`,
                            initial_comment: `📸 Screenshot of failed test: ${this.currentTest.title} on ${KORAP_URL}`
                        });

                    } catch (uploadError) {
                        console.error('Failed to upload screenshot to Slack:', uploadError.message);
                    }
                }
            }

            // Send notification to Nextcloud Talk with screenshot
            try {
                const message = `🚨 Test on ${KORAP_URL} failed: **${this.currentTest.title}**`;
                await sendToNextcloudTalk(message, false, screenshotPath);
            } catch (ncError) {
                console.error('Failed to send notification to Nextcloud Talk:', ncError.message);
            }
        }
    })

    it('should be reachable', function (done) {
        let doneCalled = false;
        const url = new URL(KORAP_URL);
        const httpModule = url.protocol === 'https:' ? https : require('http');

        const req = httpModule.request({
            method: 'HEAD',
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            timeout: 5000
        }, res => {
            if (!doneCalled) {
                doneCalled = true;
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    done();
                } else {
                    done(new Error(`Server is not reachable. Status code: ${res.statusCode}`));
                }
            }
        });
        req.on('timeout', () => {
            if (!doneCalled) {
                doneCalled = true;
                req.destroy();
                done(new Error('Request to server timed out.'));
            }
        });
        req.on('error', err => {
            if (!doneCalled) {
                doneCalled = true;
                done(err);
            }
        });
        req.end();
    });

    it('should have a valid SSL certificate', function (done) {
        let doneCalled = false;
        const url = new URL(KORAP_URL);
        if (url.protocol !== 'https:') {
            return this.skip();
        }
        const req = https.request({
            method: 'HEAD',
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            timeout: 5000
        }, res => {
            if (!doneCalled) {
                doneCalled = true;
                const cert = res.socket.getPeerCertificate();
                if (cert && cert.valid_to) {
                    const validTo = new Date(cert.valid_to);
                    if (validTo > new Date()) {
                        done();
                    } else {
                        done(new Error(`SSL certificate expired on ${validTo.toDateString()}`));
                    }
                } else if (res.socket.isSessionReused()){
                    done();
                }
                else {
                    done(new Error('Could not retrieve SSL certificate information.'));
                }
            }
        });
        req.on('timeout', () => {
            if (!doneCalled) {
                doneCalled = true;
                req.destroy();
                done(new Error('Request to server timed out.'));
            }
        });
        req.on('error', err => {
            if (!doneCalled) {
                doneCalled = true;
                if (err.code === 'CERT_HAS_EXPIRED') {
                    done(new Error('SSL certificate has expired.'));
                } else {
                    done(err);
                }
            }
        });
        req.end();
    });

    describe('UI Tests', function() {

        before(function() {
            // Check the state of the parent suite's tests
            const initialTests = this.test.parent.parent.tests;
            if (initialTests[0].state === 'failed' || initialTests[1].state === 'failed') {
                this.skip();
            }
        });

        

        it('KorAP UI is up and running', async function () {
            try {
                await page.goto(KORAP_URL, { waitUntil: 'domcontentloaded' });
                await page.waitForSelector("#q-field", { visible: true });
                const query_field = await page.$("#q-field")
                assert.isNotNull(query_field, "#q-field not found. Kalamar not running?");
            } catch (error) {
                throw new Error(`Failed to load KorAP UI or find query field: ${error.message}`);
            }
        })


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

        it('Corpus statistics show sufficient tokens',
            (async () => {
                const tokenCount = await korap_rc.check_corpus_statistics(page, KORAP_MIN_TOKENS_IN_CORPUS);
                console.log(`Found ${tokenCount} tokens in corpus, minimum required: ${KORAP_MIN_TOKENS_IN_CORPUS}`);
                tokenCount.should.be.above(KORAP_MIN_TOKENS_IN_CORPUS - 1,
                    `Corpus should have at least ${KORAP_MIN_TOKENS_IN_CORPUS} tokens, but found ${tokenCount}`);
            })).timeout(90000)

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
            })).timeout(15000)
    });
});