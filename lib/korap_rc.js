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
        const total_results = await page.$("#total-results");
        assert.notEqual(total_results, null, "Cannot find total results");

        const hits = Number((await page.evaluate(total_results => total_results.textContent, total_results)).replace(/[,.]/g, ""));
        return hits;
    }

    async logout(page) {
        await page.click('.dropdown-btn');
        await page.waitForSelector('.logout', { visible: true });
        const logout_button = await page.$(".logout")
        if (logout_button == null) {
            console.log("Logout button not found")
            return false
        }
        await logout_button.click()
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        const loginField = await page.$('input[name=handle_or_email]');
        return loginField !== null;
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
