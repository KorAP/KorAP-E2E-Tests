# KorAP-E2E-Tests

Perform basic end-to-end tests on a KorAP-Kalamar instance with a headless browser using [mocha](https://mochajs.org/), [puppeteer](https://github.com/puppeteer/puppeteer) and [chai](https://www.chaijs.com/).

##  Install

```bash
npm install
```
## Run

```bash
npm test
```

defaults to:

```bash
KORAP_URL="http://localhost:64543" KORAP_LOGIN="user2" KORAP_PWD="password2"\
 KORAP_QUERIES="npm test" KORAP_QUERIES='geht, [orth=geht & cmc/pos=VVFIN]'\
 npm test
```

### Comments on Environment Variables

- Use `KORAP_LOGIN="" npm test` to skip login and logout tests, e.g. to run tests against Kustvakt-lite.
- The tests respect the current locale, consider e.g. `LC_ALL=C npm test`