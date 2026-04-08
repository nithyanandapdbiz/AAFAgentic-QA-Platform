'use strict';
const { createExecution, updateExecution } = require("../tools/zephyrExecution.client");

/**
 * Maps Playwright results to Zephyr Essential v2.8 executions.
 * @param {string} cycleKey          - Cycle key returned by setupCycle() e.g. "SCRUM-C1"
 * @param {Array<{id, key}>} testCaseRefs - Objects returned by executor.agent
 * @param {Array} results            - Playwright parsed results
 */
async function mapResults(cycleKey, testCaseRefs, results) {
  for (const r of results) {
    // Match on test case key substring in result title; fall back to first entry
    const ref =
      testCaseRefs.find(t => r.title.toLowerCase().includes(t.key.toLowerCase())) ||
      testCaseRefs[0];
    if (!ref) continue;
    const exec = await createExecution(cycleKey, ref.key, "In Progress");
    await updateExecution(exec.id, r.passed ? "Pass" : "Fail");
  }
}
module.exports = { mapResults };
