require('dotenv').config();
const express = require("express");
const config = require("./core/config");
const routes = require("./api/routes");

// Validate JIRA_URL is a well-formed absolute URL before starting
const jiraUrl = process.env.JIRA_URL || '';
if (!jiraUrl) {
  console.error(
    '\n[main.js] ERROR: JIRA_URL is not set.\n' +
    'Copy .env.example to .env and fill in your credentials.\n' +
    'In CI, set them as GitHub Secrets.\n'
  );
  process.exit(1);
}
try {
  new URL(jiraUrl);
} catch {
  console.error(`\n[main.js] ERROR: JIRA_URL is not a valid URL: "${jiraUrl}"\n`);
  process.exit(1);
}
if (!process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
  console.error(
    '\n[main.js] ERROR: JIRA_EMAIL and JIRA_API_TOKEN must be set.\n' +
    'Copy .env.example to .env and fill in your credentials.\n'
  );
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use("/api", routes);

app.listen(config.port, () => console.log(`[main.js] API server running on port ${config.port}`));
