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
        if (this.login == "") return false;
        await page.goto(this.korap_url);
        const username_field = await page.$("body > aside > div > fieldset > form > input[type=text]")

        if (username_field != null) {
            await username_field.type(username);
            await page.keyboard.press("Tab")
            await page.keyboard.type(password)
            await page.keyboard.press("Enter")
        }

        await page.waitForNavigation();
        const logout = await page.$("body > header > div > a[class=logout]")
        if (logout == null) {
            return false
        }

        let value = await page.evaluate(logout => logout.textContent, logout)
        if (!value.match(/(Abmelden|Logout)/)) {
            return false
        }
        return true
    }

    async search(page, query) {
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

    async logout(page) {
        const logout_button = await page.$("a[class=logout]")
        if (logout_button == null) {
            return false
        }
        await page.click("a[class=logout]")
        const username_field = await page.$("body > aside > div > fieldset > form > input[type=text]")
        assert.notEqual(username_field, null)
        return true
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
