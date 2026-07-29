#!/usr/bin/env node
// Summarizes KorAP.e2e.log into one line per test run matching a keyword.
//
// Usage: node summarize-log.js <keyword> [logfile]
//   keyword  substring to match against the run's target URL (e.g. "dnb")
//   logfile  path to the log file (default: ./KorAP.e2e.log)

const fs = require('fs');
const path = require('path');

const keyword = process.argv[2];
const logFile = process.argv[3] || path.join(__dirname, 'KorAP.e2e.log');

if (!keyword) {
    console.error('Usage: node summarize-log.js <keyword> [logfile]');
    process.exit(1);
}

const lines = fs.readFileSync(logFile, 'utf8').split('\n');

const RUN_START_RE = /^\s*Running KorAP UI end-to-end tests on (\S+)/;
const TIMESTAMP_RE = /^Run started (\S+) on/;
const CHECK_RE = /^\s*(✔|✘|-)\s+(.+?)(?:\s*\(\d+m?s\))?$/;
const SUMMARY_RE = /^\s*(\d+) (passing|pending|failing)(?:\s*\(\S+\))?/;

const runs = [];
let current = null;

for (const line of lines) {
    const startMatch = line.match(RUN_START_RE);
    if (startMatch) {
        current = { url: startMatch[1], timestamp: null, checks: [], summary: {} };
        runs.push(current);
        continue;
    }
    if (!current) continue;

    const tsMatch = line.match(TIMESTAMP_RE);
    if (tsMatch) {
        current.timestamp = tsMatch[1];
        continue;
    }

    const checkMatch = line.match(CHECK_RE);
    if (checkMatch) {
        const [, mark, name] = checkMatch;
        const status = mark === '✔' ? 'pass' : mark === '✘' ? 'fail' : 'skip';
        current.checks.push({ status, name: name.trim() });
        continue;
    }

    const summaryMatch = line.match(SUMMARY_RE);
    if (summaryMatch) {
        current.summary[summaryMatch[2]] = parseInt(summaryMatch[1], 10);
    }
}

const matching = runs.filter(r => r.url.toLowerCase().includes(keyword.toLowerCase()));

if (matching.length === 0) {
    console.error(`No runs found matching "${keyword}" in ${logFile}`);
    process.exit(1);
}

for (const run of matching) {
    const date = run.timestamp ? run.timestamp.replace('T', ' ').replace(/\.\d+Z$/, '') : 'unknown time';
    const [datePart, timePart] = date.split(' ');

    const failed = run.checks.filter(c => c.status === 'fail');
    const passed = run.summary.passing ?? run.checks.filter(c => c.status === 'pass').length;
    const skipped = run.summary.pending ?? run.checks.filter(c => c.status === 'skip').length;

    const mark = failed.length > 0 ? '✗' : '✓';
    const info = failed.length > 0
        ? `${passed} passing, ${failed.length} failing: ${failed.map(c => c.name).join('; ')}`
        : `${passed} passing, ${skipped} skipped`;

    console.log(`${datePart}  ${timePart}  ${info}  ${mark}`);
}
