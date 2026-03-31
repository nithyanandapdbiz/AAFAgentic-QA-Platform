const fs = require("fs");
function parseResults(){
  const data = JSON.parse(fs.readFileSync("test-results.json"));
  const out = [];
  (data.suites||[]).forEach(s=>{
    (s.tests||[]).forEach(t=>{
      out.push({ title: t.title, passed: t.outcome === "expected" });
    });
  });
  return out;
}
module.exports = { parseResults };
