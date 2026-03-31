const { getStory } = require("../tools/jira.client");
const planner = require("../agents/planner.agent");
const qa = require("../agents/qa.agent");
const reviewer = require("../agents/reviewer.agent");
const executor = require("../agents/executor.agent");

async function runAgentFlow(issueKey){
  const story = await getStory(issueKey);
  const plan = await planner.plan(story);
  let testCases = await qa.generate(story, plan);
  testCases = await reviewer.review(testCases);
  const { createdKeys } = await executor.execute(testCases);
  return { story, testCases, createdKeys };
}
module.exports = { runAgentFlow };
