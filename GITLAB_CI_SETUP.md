# GitLab CI/CD Setup for KorAP E2E Tests

This document explains how to configure GitLab CI/CD variables for running the KorAP E2E tests.

## Required CI/CD Variables

To run the E2E tests in GitLab CI/CD, you need to set up the following variables in your GitLab project:

### 1. Navigate to Project Settings
- Go to your GitLab project
- Navigate to **Settings > CI/CD**
- Expand the **Variables** section

### 2. Add Required Variables

#### KORAP_USERNAME (Required)
- **Key**: `KORAP_USERNAME`
- **Value**: Your KorAP login username
- **Type**: Variable
- **Environment scope**: All
- **Protect variable**: ✅ (recommended)
- **Mask variable**: ❌ (usernames are usually not sensitive)

#### KORAP_PASSWORD (Required)
- **Key**: `KORAP_PASSWORD`
- **Value**: Your KorAP login password
- **Type**: Variable
- **Environment scope**: All
- **Protect variable**: ✅ (recommended)
- **Mask variable**: ✅ (recommended)

#### SLACK_WEBHOOK (Optional)
- **Key**: `SLACK_WEBHOOK`
- **Value**: Your Slack webhook URL for notifications
- **Type**: Variable  
- **Environment scope**: All
- **Protect variable**: ✅ (recommended)
- **Mask variable**: ✅ (recommended)

## Optional Configuration Variables

You can override the default configuration by setting these variables:

#### KORAP_URL
- **Default**: `https://korap.ids-mannheim.de/`
- **Description**: The KorAP instance URL to test against

#### KORAP_QUERIES
- **Default**: `geht, [orth=geht & tt/p="VVFIN"]`
- **Description**: Comma-separated list of queries to test

## Pipeline Triggers

The CI pipeline will run:
- ✅ On pushes to the main branch
- ✅ On merge requests
- ✅ On scheduled pipelines (if configured)
- ✅ On manual triggers (web UI or API)

## Manual Triggering

You can manually trigger the E2E tests in several ways:

### 1. Via GitLab Web UI
1. Go to your project in GitLab
2. Navigate to **CI/CD > Pipelines**
3. Click **Run pipeline**
4. Select the branch you want to test
5. Optionally add custom variables (see below)
6. Click **Run pipeline**

### 2. Via GitLab API

First, create a pipeline trigger token:
1. Go to **Settings > CI/CD > Pipeline triggers**
2. Click **Add trigger**
3. Give it a description (e.g., "Manual E2E tests")
4. Copy the generated token

Then use the API:
```bash
curl -X POST \
  -F token=<your-trigger-token> \
  -F ref=main \
  -F "variables[KORAP_URL]=https://korap.ids-mannheim.de/" \
  -F "variables[KORAP_QUERIES]=geht" \
  https://gitlab.example.com/api/v4/projects/<project-id>/trigger/pipeline
```

### 3. Custom Variables for Manual Runs
When manually triggering, you can override default values by adding variables:

- **KORAP_URL**: Test against a different KorAP instance
- **KORAP_USERNAME**: Use a different username  
- **KORAP_QUERIES**: Test with custom queries
- **DEBUG**: Set to `puppeteer:*` for verbose output

Example: To test against a local instance:
- Key: `KORAP_URL`, Value: `http://localhost:64543`
- Key: `KORAP_USERNAME`, Value: `testuser`

## Test Artifacts

When tests run, the pipeline will **always** generate artifacts, regardless of test success or failure:

- **JUnit XML report**: `test-results.xml` for GitLab test reporting and analysis
- **Screenshots**: `failed_*.png` files for any failing tests  
- **Artifacts retention**: 1 week

The artifacts are collected with `when: always`, ensuring that:
- ✅ Test results are preserved even when tests fail
- ✅ Failure screenshots are captured for debugging
- ✅ GitLab can display test reports in the merge request and pipeline views
- ✅ You can download and analyze the detailed XML test results

## Scheduling Tests

To run tests on a schedule:

1. Go to **CI/CD > Schedules**
2. Click **New schedule**
3. Set your desired frequency (e.g., daily, weekly)
4. The scheduled runs will include Slack notifications if configured

## Local Testing

To test the same configuration locally:

```bash
export KORAP_USERNAME="your-username"
export KORAP_PASSWORD="your-password"
export KORAP_URL="https://korap.ids-mannheim.de/"
export KORAP_QUERIES='geht, [orth=geht & tt/p="VVFIN"]'
export LC_ALL="C"

npm test
```

## Troubleshooting

### Common Issues

1. **Missing required variables**
   - Ensure both `KORAP_USERNAME` and `KORAP_PASSWORD` variables are set
   - Check that variables are not masked incorrectly
   - Verify that the variable scope includes your branch

2. **Puppeteer installation issues**
   - The CI configuration includes all required system dependencies
   - Uses Node.js 18 with Debian Bullseye for compatibility

3. **Chrome sandbox errors in CI**
   - Error: "Running as root without --no-sandbox is not supported"
   - Solution: The test configuration includes `--no-sandbox` and other CI-friendly Chrome flags
   - These flags are automatically applied in the test setup

4. **Test timeouts**
   - Pipeline timeout is set to 5 minutes
   - Individual tests have their own timeouts (15-20 seconds)
   - Network issues are handled with automatic retry (max 2 attempts)

### Debugging

Enable debug output by adding this variable:
- **Key**: `DEBUG`
- **Value**: `puppeteer:*`
