# KorAP-E2E-Tests

Perform basic end-to-end tests on a KorAP-Kalamar instance with a headless browser using [mocha](https://mochajs.org/), [puppeteer](https://github.com/puppeteer/puppeteer) and [chai](https://www.chaijs.com/).

## Install

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
 KORAP_QUERIES='geht, [orth=geht & cmc/pos=VVFIN]'\
 npm test
```

### Comments on Environment Variables

- Use `KORAP_LOGIN="" npm test` to skip login and logout tests, e.g. to run tests against Kustvakt-lite.
- The tests respect the current locale, consider e.g. `LC_ALL=C npm test`

## Development and License

**Authors**:

- [Marc Kupietz](https://www.ids-mannheim.de/digspra/personal/kupietz.html)

Copyright (c) 2022, [Leibniz Institute for the German Language](http://www.ids-mannheim.de/), Mannheim, Germany

This package is developed as part of the [KorAP](http://korap.ids-mannheim.de/) Corpus Analysis Platform at the Leibniz Institute for German Language ([IDS](http://www.ids-mannheim.de/)).

The package is published under the [Apache 2.0 License](LICENSE).

## Contributions

Contributions are very welcome!

Your contributions should ideally be committed via our [Gerrit server](https://korap.ids-mannheim.de/gerrit/)
to facilitate reviewing (see [Gerrit Code Review - A Quick Introduction](https://korap.ids-mannheim.de/gerrit/Documentation/intro-quick.html)
if you are not familiar with Gerrit). However, we are also happy to accept comments and pull requests
via GitHub.

## References

Diewald, Nils/Margaretha, Eliza/Kupietz, Marc (2021): Lessons learned in quality management for online research software tools in linguistics. In: Lüngen, Harald et al. (Hg.): Proceedings of the Workshop on Challenges in the Management of Large Corpora (CMLC-9) 2021. Limerick, 12 July 2021 (Online-Event). Mannheim: Leibniz-Institut für Deutsche Sprache, p. 20–26. [doi:10.14618/ids-pub-10469](https://doi.org/10.14618/ids-pub-10469).
