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
            console.log(`Starting corpus statistics check with minTokenThreshold: ${minTokenThreshold}`);

            // Navigate to the corpus view if not already there
            console.log(`Navigating to: ${this.korap_url}`);
            await page.goto(this.korap_url, { waitUntil: 'domcontentloaded' });
            console.log("Navigation completed");

            // Click the vc-choose element to open corpus selection
            console.log("Waiting for #vc-choose selector...");
            await page.waitForSelector('#vc-choose', { visible: true, timeout: 90000 });
            console.log("Found #vc-choose, clicking...");
            await page.click('#vc-choose');
            console.log("Clicked #vc-choose");

            // Wait a moment for the UI to respond
            console.log("Waiting 1 second for UI to respond...");
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Click the statistic element
            console.log("Waiting for .statistic selector...");
            await page.waitForSelector('.statistic', { visible: true, timeout: 90000 });
            console.log("Found .statistic element, attempting to click...");
            try {
                await page.click('.statistic');
                console.log("Successfully clicked .statistic element");
            } catch (error) {
                console.error(`Failed to click statistic element: ${error.message}`);
                throw new Error(`Failed to click statistic element: ${error.message}`);
            }

            // Wait for statistics to load with a more efficient approach
            console.log("Waiting for token statistics to load...");
            
            // First, wait for any dd elements to appear (basic structure)
            await page.waitForSelector('dd', { visible: true, timeout: 30000 });
            
            // Then wait for the specific token statistics with a simplified check
            await page.waitForFunction(() => {
                // Simplified check - look for any dd element with a large number
                const ddElements = document.querySelectorAll('dd');
                for (let i = 0; i < ddElements.length; i++) {
                    const text = ddElements[i].textContent || ddElements[i].innerText || '';
                    const cleanedText = text.replace(/[,\.]/g, '');
                    const numbers = cleanedText.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        const num = parseInt(numbers[0], 10);
                        if (num > 1000) { // Found a substantial number, likely loaded
                            return true;
                        }
                    }
                }
                return false;
            }, { timeout: 90000, polling: 1000 }); // Poll every second instead of continuously

            // Look for the tokens count in a dd element that follows an element with title "tokens"
            console.log(`Starting token count extraction with minThreshold: ${minTokenThreshold}`);
            const tokenCount = await page.evaluate((minThreshold) => {
                // Find the element with title "tokens" first
                const tokenTitleElements = document.querySelectorAll('[title="tokens"], [title*="token"]');
                
                for (let i = 0; i < tokenTitleElements.length; i++) {
                    const element = tokenTitleElements[i];
                    
                    // Look for the next dd element
                    let nextElement = element.nextElementSibling;
                    let siblingCount = 0;
                    while (nextElement && siblingCount < 10) {
                        siblingCount++;
                        
                        if (nextElement.tagName.toLowerCase() === 'dd') {
                            const text = nextElement.textContent || nextElement.innerText || '';
                            // Remove number separators (commas and periods) and extract number
                            const cleanedText = text.replace(/[,\.]/g, '');
                            const numbers = cleanedText.match(/\d+/g);
                            if (numbers && numbers.length > 0) {
                                const tokenValue = parseInt(numbers[0], 10);
                                return tokenValue;
                            }
                        }
                        nextElement = nextElement.nextElementSibling;
                    }
                }

                // Alternative approach: look for dd elements that contain large numbers
                const ddElements = document.querySelectorAll('dd');
                const candidateTokenCounts = [];

                for (let i = 0; i < ddElements.length; i++) {
                    const dd = ddElements[i];
                    const text = dd.textContent || dd.innerText || '';
                    // Remove separators and check if it's a large number (likely token count)
                    const cleanedText = text.replace(/[,\.]/g, '');
                    const numbers = cleanedText.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        const num = parseInt(numbers[0], 10);
                        
                        // Use the provided threshold to filter candidates
                        if (num > minThreshold) {
                            candidateTokenCounts.push({ value: num, text: text, index: i });
                        }
                    }
                }

                if (candidateTokenCounts.length > 0) {
                    // Return the largest candidate (most likely to be the total token count)
                    const bestCandidate = candidateTokenCounts.reduce((max, current) =>
                        current.value > max.value ? current : max
                    );
                    return bestCandidate.value;
                }

                return null;
            }, minTokenThreshold);

            console.log(`Token count extraction completed. Result: ${tokenCount}`);

            if (tokenCount === null) {
                console.error("ERROR: Token count extraction returned null");
                throw new Error("Could not find token count in corpus statistics");
            }

            console.log(`SUCCESS: Found token count: ${tokenCount}, threshold was: ${minTokenThreshold}`);
            return tokenCount;

        } catch (error) {
            console.error(`ERROR in check_corpus_statistics: ${error.message}`);
            console.error("Full error stack:", error.stack);
            throw new Error(`Failed to check corpus statistics: ${error.message}`);
        }
    }
}

module.exports = KorAPRC