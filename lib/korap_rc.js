const chai = require('chai');
const assert = chai.assert;

class KorAPRC {
    korap_url = ""

    constructor(korap_url) {
        this.korap_url = korap_url
    }

    static new(korap_url) {
        return new KorAPRC(korap_url)
    }

    async login(page, username, password) {
        page.goto(this.korap_url);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (this.login == "") return false;
        if (username == "") return false;
        if (password == "") return false;

        await page.click('.dropdown-btn');
        await page.waitForSelector('input[name=handle_or_email]', { visible: true });
        const username_field = await page.$("input[name=handle_or_email]")
        if (username_field != null) {
            await username_field.focus();
            await username_field.type(username);
            const password_field = await page.$("input[name=pwd]")
            await password_field.focus()
            await page.keyboard.type(password)
            await page.keyboard.press("Enter")
        } else {
            return false
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        const logout = await page.$(".logout")
        if (logout == null) {
            return false
        }

        return true
    }

    async search(page, query) {
        const query_field = await page.$("#q-field");
        assert.notEqual(query_field, null, "Query field not found");

        await page.waitForSelector("#q-field", { visible: true });
        await query_field.click({ clickCount: 3 });
        await page.keyboard.type(query);
        await page.keyboard.press("Enter");

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Wait for search results to be fully loaded
        try {
            await page.waitForSelector('ol li, #resultinfo, .result-item', {
                visible: true,
                timeout: 15000
            });
            // Give additional time for the results count to be populated
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            // Continue if timeout, fallback methods will handle it
        }

        const resultsInfo = await page.evaluate(() => {
            // Check common selectors for result counts
            const selectors = [
                '#total-results',
                '#resultinfo',
                '.result-count',
                '.total-results',
                '[data-results]',
                '.found'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent || element.innerText || '';
                    const numbers = text.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        return {
                            selector: selector,
                            numbers: numbers
                        };
                    }
                }
            }

            // Look in the page title for results count
            const title = document.title;
            if (title) {
                const numbers = title.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    return {
                        selector: 'title',
                        numbers: numbers
                    };
                }
            }

            // Count the actual result items as fallback
            const resultItems = document.querySelectorAll('ol li');
            if (resultItems.length > 0) {
                return {
                    selector: 'counted-items',
                    numbers: [resultItems.length.toString()]
                };
            }

            return null;
        });

        if (!resultsInfo || !resultsInfo.numbers || resultsInfo.numbers.length === 0) {
            // Final fallback: just count visible list items
            const itemCount = await page.evaluate(() => {
                return document.querySelectorAll('ol li').length;
            });

            if (itemCount > 0) {
                return itemCount;
            }

            throw new Error("Cannot find any results count on the page");
        }

        // Extract the largest number found (likely the total results)
        const hits = Math.max(...resultsInfo.numbers.map(n => parseInt(n, 10)));
        return hits;
    }

    async logout(page) {
        try {
            // Direct navigation to logout URL - most reliable method
            const currentUrl = await page.url();
            const logoutUrl = currentUrl.replace(/\/$/, '') + '/logout';

            await page.goto(logoutUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

            // Navigate back to main page to ensure clean state for subsequent tests
            await page.goto(this.korap_url, { waitUntil: 'domcontentloaded', timeout: 10000 });

            return true;
        } catch (error) {
            return false;
        }
    }

    async assure_glimpse_off(page) {
        const glimpse = await page.$("input[name=cutoff]")
        const glimpse_value = await (await glimpse.getProperty('checked')).jsonValue()
        if (glimpse_value) {
            await page.click("#glimpse")
        }

    }
}

module.exports = KorAPRC
