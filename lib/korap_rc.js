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

            // Check if already logged in as the correct user
            const currentLoggedInUser = await page.evaluate(() => {
                const profileBtn = document.querySelector('.dropdown-btn.profile');
                if (profileBtn) {
                    const userNameEl = profileBtn.querySelector('.user-name');
                    return userNameEl ? userNameEl.textContent.trim() : null;
                }
                return null;
            });

            if (currentLoggedInUser === username) {
                console.log(`Already logged in as ${username}`);
                return true;
            } else if (currentLoggedInUser) {
                console.log(`Logged in as different user: ${currentLoggedInUser}. Logging out...`);
                await this.logout(page);
                await page.goto(this.korap_url, { waitUntil: 'domcontentloaded' });
            }

            await page.waitForSelector('.dropdown-btn', { visible: true });
            const loginBtn = await page.$('.dropdown-btn.login') || await page.$('.dropdown-btn');
            if (!loginBtn) {
                return false;
            }
            await loginBtn.click();
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
            const logout = await page.$(".logout, a[data-testid=\"logout\"], .dropdown-btn.profile")
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

            // Wait until the results page has actually settled, then read the
            // count immediately (no fixed sleep). Kalamar renders the precise
            // total into #total-results (e.g. "1,039,193") on hits, but when
            // glimpse/cutoff is on it lists matches without computing a total,
            // and on a miss it shows a .no-results message. A search "has hits"
            // as soon as any match is listed, so settle on whichever appears.
            await page.waitForFunction(() => {
                const total = document.querySelector('#total-results');
                if (total && /\d/.test(total.textContent || '')) return true;
                if (document.querySelectorAll('#search ol li').length > 0) return true;
                return document.querySelector('#search .no-results, .no-results') !== null;
            }, { timeout: 15000, polling: 200 });

            const hits = await page.evaluate(() => {
                const total = document.querySelector('#total-results');
                if (total) {
                    // The span holds only the number; strip thousands separators
                    // (commas, periods, spaces) and parse what remains.
                    const digits = (total.textContent || '').replace(/[^\d]/g, '');
                    if (digits.length > 0) return parseInt(digits, 10);
                }

                // No exact total (e.g. glimpse/cutoff on): listed matches still
                // prove the query has hits, so fall back to counting them.
                const items = document.querySelectorAll('#search ol li').length;
                if (items > 0) return items;

                // Explicit "no matches" state reported by Kalamar.
                return 0;
            });

            return hits;
        } catch (error) {
            throw new Error(`Failed to perform search: ${error.message}`);
        }
    }

    async logout(page) {
        try {
            // First, try to find the logout link in the page
            const logoutHref = await page.evaluate(() => {
                const logoutEl = document.querySelector('a.logout, a[data-testid="logout"]');
                return logoutEl ? logoutEl.getAttribute('href') : null;
            });

            if (logoutHref) {
                const absoluteLogoutUrl = new URL(logoutHref, page.url()).href;
                await page.goto(absoluteLogoutUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            } else {
                const currentUrl = await page.url();
                const baseUrl = currentUrl.replace(/\/$/, '');
                try {
                    await page.goto(baseUrl + '/user/logout', { waitUntil: 'domcontentloaded', timeout: 5000 });
                } catch (e) {
                    await page.goto(baseUrl + '/logout', { waitUntil: 'domcontentloaded', timeout: 5000 });
                }
            }

            // Navigate back to main page to ensure clean state for subsequent tests
            await page.goto(this.korap_url, { waitUntil: 'domcontentloaded', timeout: 10000 });

            // Verify we are actually logged out
            const loggedOut = await page.evaluate(() => {
                return document.querySelector('a.logout, a[data-testid="logout"], .dropdown-btn.profile') === null;
            });

            return loggedOut;
        } catch (error) {
            console.error(`Logout failed: ${error.message}`);
            return false;
        }
    }

    async assure_glimpse_off(page) {
        // Get the cutoff checkbox - works in both old and new Kalamar versions
        const glimpse = await page.$("input[name=cutoff]")
        if (!glimpse) {
            console.log("Glimpse checkbox not found, skipping")
            return
        }
        const glimpse_value = await (await glimpse.getProperty('checked')).jsonValue()
        if (glimpse_value) {
            // Try new Kalamar version first (toggle button with class 'glimpse')
            const newGlimpseButton = await page.$(".glimpse")
            if (newGlimpseButton) {
                const isVisible = await page.evaluate(el => {
                    const style = window.getComputedStyle(el)
                    return style.display !== 'none' && style.visibility !== 'hidden'
                }, newGlimpseButton)
                if (isVisible) {
                    await newGlimpseButton.click()
                    return
                }
            }
            // Fall back to old Kalamar version (label with id 'glimpse')
            const oldGlimpseLabel = await page.$("#glimpse")
            if (oldGlimpseLabel) {
                const isVisible = await page.evaluate(el => {
                    const style = window.getComputedStyle(el.parentNode || el)
                    return style.display !== 'none' && style.visibility !== 'hidden'
                }, oldGlimpseLabel)
                if (isVisible) {
                    await page.click("#glimpse")
                    return
                }
            }
            // Last resort: directly toggle the checkbox via JavaScript
            await page.evaluate(() => {
                const checkbox = document.querySelector("input[name=cutoff]")
                if (checkbox) checkbox.checked = false
            })
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