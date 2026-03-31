const fs = require("fs");
function getDashboard(req, res){
  const data = JSON.parse(fs.readFileSync("test-results.json"));
  const tests = (data.suites||[]).flatMap(s=>s.tests||[]);
  const passed = tests.filter(t=>t.outcome==="expected").length;
  const failed = tests.length - passed;
  res.json({ total: tests.length, passed, failed });
}
module.exports = { getDashboard };
