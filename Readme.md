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
KORAP_URL="http://localhost:64543" KORAP_USERNAME="user2" KORAP_PASSWORD="password2"\
 KORAP_QUERIES='geht, [orth=geht & cmc/pos=VVFIN]' KORAP_MIN_TOKENS_IN_CORPUS="100000"\
 npm test
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KORAP_URL` | `http://localhost:64543` | The KorAP instance URL to test against |
| `KORAP_USERNAME` | `user2` | Username for KorAP login (also accepts legacy `KORAP_LOGIN`) |
| `KORAP_PASSWORD` | `password2` | Password for KorAP login (also accepts legacy `KORAP_PWD`) |
| `KORAP_QUERIES` | `geht, [orth=geht & cmc/pos=VVFIN]` | Comma-separated list of queries to test |
| `KORAP_MIN_TOKENS_IN_CORPUS` | `100000` | Minimum expected number of tokens for corpus statistics test |
| `SLACK_WEBHOOK_URL` | _(none)_ | Slack webhook URL for test failure notifications (text only) |
| `SLACK_TOKEN` | _(none)_ | Slack bot token for uploading failure screenshots |
| `SLACK_CHANNEL_ID` | `C07CM4JS48H` | Slack channel ID for screenshot uploads (e.g., `C1234567890`) |
| `LC_ALL` | _(system default)_ | Locale setting (recommended: `C` for consistent results) |

### Usage Notes

- Use `KORAP_USERNAME="" npm test` to skip login and logout tests, e.g. to run tests against Kustvakt-lite
- The tests support both new variable names (`KORAP_USERNAME`, `KORAP_PASSWORD`) and legacy names (`KORAP_LOGIN`, `KORAP_PWD`) for backward compatibility
- Set `LC_ALL=C` for consistent locale-independent test results

## GitLab CI/CD

This project includes GitLab CI/CD configuration for automated testing. See [GITLAB_CI_SETUP.md](GITLAB_CI_SETUP.md) for detailed setup instructions.

Quick setup:

1. Set the `KORAP_USERNAME` and `KORAP_PASSWORD` variables in your GitLab project's CI/CD settings
2. Optionally set `SLACK_WEBHOOK` for notifications
3. Push to trigger the pipeline

### Notifications

If you run KorAP-E2E-tests as a cronjob or in scheduled pipelines and
want to get notified about failed tests via slack, set the environment variable `SLACK_WEBHOOK_URL` to the URL of your [slack webhook](https://api.slack.com/messaging/webhooks).


## Development and License

**Authors**:

- [Marc Kupietz](https://www.ids-mannheim.de/digspra/personal/kupietz.html)

Copyright (c) 2025, [Leibniz Institute for the German Language](http://www.ids-mannheim.de/), Mannheim, Germany

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
