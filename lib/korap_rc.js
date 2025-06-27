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
        try {
            await page.goto(this.korap_url, { waitUntil: 'domcontentloaded' });
            if (username == "") return false;
            if (password == "") return false;

            await page.waitForSelector('.dropdown-btn', { visible: true });
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

            await page.waitForNavigation({ waitUntil: 'domcontentloaded' }); // Wait for navigation after login
            await page.waitForSelector("#q-field", { visible: true }); // Wait for query field to confirm login
            const logout = await page.$(".logout")
            if (logout == null) {
                return false
            }

            return true
        } catch (error) {
            console.error(`Login failed: ${error.message}`);
            return false;
        }
    }

    async search(page, query) {
        try {
            await page.waitForSelector("#q-field", { visible: true });
            const query_field = await page.$("#q-field");
            assert.notEqual(query_field, null, "Query field not found");

            await query_field.click({ clickCount: 3 });
            await page.keyboard.type(query);
            await page.keyboard.press("Enter");

            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

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
        } catch (error) {
            throw new Error(`Failed to perform search: ${error.message}`);
        }
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

    async check_corpus_statistics(page, minTokenThreshold = 1000) {
        try {
            // Navigate to the corpus view if not already there
            await page.goto(this.korap_url, { waitUntil: 'domcontentloaded' });
            
            // Click the vc-choose element to open corpus selection
            await page.waitForSelector('#vc-choose', { visible: true, timeout: 90000 });
            await page.click('#vc-choose');
            
            // Wait a moment for the UI to respond
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Click the statistic element
            await page.waitForSelector('.statistic', { visible: true, timeout: 90000 });
            try {
                await page.click('.statistic');
            } catch (error) {
                throw new Error(`Failed to click statistic element: ${error.message}`);
            }
            
            // Wait for statistics to load and token count to appear
            await page.waitForFunction(() => {
                const tokenTitleElements = document.querySelectorAll('[title="tokens"], [title*="token"]');
                for (const element of tokenTitleElements) {
                    let nextElement = element.nextElementSibling;
                    while (nextElement) {
                        if (nextElement.tagName.toLowerCase() === 'dd') {
                            const text = nextElement.textContent || nextElement.innerText || '';
                            const cleanedText = text.replace(/[,\.]/g, '');
                            const numbers = cleanedText.match(/\d+/g);
                            if (numbers && numbers.length > 0) {
                                return true;
                            }
                        }
                        nextElement = nextElement.nextElementSibling;
                    }
                }
                const ddElements = document.querySelectorAll('dd');
                for (const dd of ddElements) {
                    const text = dd.textContent || dd.innerText || '';
                    const cleanedText = text.replace(/[,\.]/g, '');
                    const numbers = cleanedText.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        return true;
                    }
                }
                return false;
            }, { timeout: 60000 });

            // Look for the tokens count in a dd element that follows an element with title "tokens"
            const tokenCount = await page.evaluate((minThreshold) => {
                console.log("Attempting to find token count within page.evaluate...");
                // Find the element with title "tokens"
                const tokenTitleElements = document.querySelectorAll('[title="tokens"], [title*="token"]');
                
                for (const element of tokenTitleElements) {
                    // Look for the next dd element
                    let nextElement = element.nextElementSibling;
                    while (nextElement) {
                        if (nextElement.tagName.toLowerCase() === 'dd') {
                            const text = nextElement.textContent || nextElement.innerText || '';
                            // Remove number separators (commas and periods) and extract number
                            const cleanedText = text.replace(/[,\.]/g, '');
                            const numbers = cleanedText.match(/\d+/g);
                            if (numbers && numbers.length > 0) {
                                console.log(`Found token count from title element: ${numbers[0]}`);
                                return parseInt(numbers[0], 10);
                            }
                        }
                        nextElement = nextElement.nextElementSibling;
                    }
                }
                
                // Alternative approach: look for dd elements that contain large numbers
                const ddElements = document.querySelectorAll('dd');
                for (const dd of ddElements) {
                    const text = dd.textContent || dd.innerText || '';
                    // Remove separators and check if it's a large number (likely token count)
                    const cleanedText = text.replace(/[,\.]/g, '');
                    const numbers = cleanedText.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        const num = parseInt(numbers[0], 10);
                        // Use the provided threshold instead of hardcoded value
                        if (num > minThreshold) {
                            console.log(`Found token count from dd element: ${num}`);
                            return num;
                        }
                    }
                }
                
                console.log("Could not find token count using any method.");
                return null;
            }, minTokenThreshold);
            
            if (tokenCount === null) {
                throw new Error("Could not find token count in corpus statistics");
            }
            
            return tokenCount;
            
        } catch (error) {
            throw new Error(`Failed to check corpus statistics: ${error.message}`);
        }
    }
}

module.exports = KorAPRC