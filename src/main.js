const express = require("express");
const config = require("./core/config");
const routes = require("./api/routes");
const { runAgentFlow } = require("./orchestrator/agentOrchestrator");
const { finalFlow } = require("./orchestrator/finalFlow");

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
