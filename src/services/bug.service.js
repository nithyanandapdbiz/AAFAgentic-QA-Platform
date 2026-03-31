const { createBug } = require("../tools/jiraBug.client");
async function createBugsForFailures(results){
  const failed = results.filter(r=>!r.passed);
  for(const t of failed){ await createBug(t); }
}
module.exports = { createBugsForFailures };
