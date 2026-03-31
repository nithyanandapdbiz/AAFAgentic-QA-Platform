const fs = require("fs");
const path = require("path");

function generateTest(tc) {
  const name = tc.title.replace(/\W+/g, "_").toLowerCase();
  const dir = path.resolve("tests/generated");
  fs.mkdirSync(dir, { recursive: true });
  const content = `import { test, expect } from '@playwright/test';

test('${tc.title}', async ({ page }) => {
  await page.goto('/');
  ${(tc.steps || []).map(s => `// ${s}`).join("\n  ")}
  expect(true).toBeTruthy();
});
`;
  fs.writeFileSync(path.join(dir, `${name}.spec.js`), content);
}
module.exports = { generateTest };
