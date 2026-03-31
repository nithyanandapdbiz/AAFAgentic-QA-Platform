function calculateCoverage(testCases, story){
  const text = JSON.stringify(story.fields||{});
  const covered = testCases.filter(tc=> text.includes(tc.title)).length;
  return { coverage: testCases.length ? (covered/testCases.length)*100 : 0 };
}
module.exports = { calculateCoverage };
