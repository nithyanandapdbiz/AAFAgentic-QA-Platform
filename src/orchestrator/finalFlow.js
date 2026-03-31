const { parseResults } = require("../utils/resultParser");
const { createBugsForFailures } = require("../services/bug.service");
const { detectFlaky } = require("../services/flaky.service");
const { calculateCoverage } = require("../services/coverage.service");
const { setupCycle } = require("../services/cycle.service");
const { mapResults } = require("../services/executionMapping.service");
const { runPlaywright } = require("../services/execution.service");

async function finalFlow(issueKey, testCases, testCaseKeys){
  const cycleKey = await setupCycle(issueKey);
  await runPlaywright();
  const results = parseResults();

  await createBugsForFailures(results);

  results.forEach(r=>{
    if(detectFlaky(r.title, r.passed)){
      console.log("Flaky:", r.title);
    }
  });

  const coverage = calculateCoverage(testCases, { fields: {} });
  console.log("Coverage:", coverage);

  await mapResults(cycleKey, testCaseKeys, results);
}
module.exports = { finalFlow };
