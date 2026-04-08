'use strict';
const fs   = require("fs");
const path = require("path");

const RESULTS_FILE = path.resolve(__dirname, "..", "..", "test-results.json");

function parseResults() {
  if (!fs.existsSync(RESULTS_FILE)) return [];

  const data = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
  const out  = [];

  function walkSuites(suites) {
    for (const s of suites || []) {
      for (const t of s.tests || []) {
        out.push({ title: t.title, passed: t.outcome === "expected" });
      }
      if (s.suites) walkSuites(s.suites);
    }
  }

  walkSuites(data.suites);
  return out;
}
module.exports = { parseResults };
