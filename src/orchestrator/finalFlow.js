'use strict';
const { parseResults } = require("../utils/resultParser");
const { createBugsForFailures } = require("../services/bug.service");
const { detectFlaky } = require("../services/flaky.service");
const { calculateCoverage } = require("../services/coverage.service");
const { setupCycle } = require("../services/cycle.service");
const { mapResults } = require("../services/executionMapping.service");
const { runPlaywright } = require("../services/execution.service");
const logger = require("../utils/logger");

async function finalFlow(issueKey, testCases, testCaseKeys, story) {
  try {
    const cycleKey = await setupCycle(issueKey);
    await runPlaywright();
    const results = parseResults();

    await createBugsForFailures(results, issueKey);

    results.forEach(r => {
      if (detectFlaky(r.title, r.passed)) {
        logger.warn(`Flaky test detected: ${r.title}`);
      }
    });

    const coverage = calculateCoverage(testCases, story || { fields: {} });
    logger.info(`Coverage: ${JSON.stringify(coverage)}`);

    await mapResults(cycleKey, testCaseKeys, results);
  } catch (err) {
    logger.error(`finalFlow failed for ${issueKey}: ${err.message}`);
    throw err;
  }
}
module.exports = { finalFlow };
