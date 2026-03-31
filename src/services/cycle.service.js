const { createTestCycle } = require("../tools/zephyrCycle.client");

/**
 * Creates a Zephyr Essential v2.8 test cycle and returns its string key
 * (e.g. "SCRUM-C1"). The key is passed to createExecution as testCycleKey.
 */
async function setupCycle(storyKey) {
  const cycle = await createTestCycle(`Cycle-${storyKey}-${Date.now()}`);
  return cycle.key;
}
module.exports = { setupCycle };
