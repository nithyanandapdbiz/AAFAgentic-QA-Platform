const express = require("express");
const config = require("./core/config");
const routes = require("./api/routes");
const { runAgentFlow } = require("./orchestrator/agentOrchestrator");
const { finalFlow } = require("./orchestrator/finalFlow");

// Guard: required env vars must be set before making API calls
if (!process.env.JIRA_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
  console.error(
    '\n[main.js] ERROR: JIRA_URL, JIRA_EMAIL and JIRA_API_TOKEN must be set.\n' +
    'Copy .env.example to .env and fill in your credentials.\n' +
    'In CI, set them as GitHub Secrets.\n'
  );
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use("/api", routes);

app.listen(config.port, ()=>console.log("API running on", config.port));

(async ()=>{
  const issueKey = process.env.ISSUE_KEY || "ABC-123";
  const { testCases, createdKeys } = await runAgentFlow(issueKey);
  console.log("Generated:", testCases.length);
  await finalFlow(issueKey, testCases, createdKeys);
})();
