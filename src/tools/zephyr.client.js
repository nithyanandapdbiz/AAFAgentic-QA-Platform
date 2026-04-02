const axios = require("axios");
const config = require("../core/config");
const { zephyrHeaders } = require("../utils/zephyrJwt");

/**
 * Zephyr Essential Cloud API v2.8 — Test Cases
 *
 * POST /testcases          — create a test case
 * POST /testcases/{key}/teststeps — attach steps (mode OVERWRITE)
 *
 * Returns { id, key } where key is the Zephyr test case key (e.g. SCRUM-T1)
 */
async function createTestCase(tc) {
  const res = await axios.post(
    `${config.zephyr.baseUrl}/testcases`,
    {
      projectKey: config.zephyr.projectKey,
      name: tc.title,
      objective: tc.description || tc.title,
      labels: tc.tags || [],
      priorityName: tc.priority || "Normal"
    },
    { headers: zephyrHeaders() }
  );
  const { id, key } = res.data;

  // Attach steps — use GWT-prefixed descriptions when available
  if (tc.steps && tc.steps.length > 0) {
    const gwtSteps = tc.gwt && tc.gwt.length === tc.steps.length ? tc.gwt : null;
    await axios.post(
      `${config.zephyr.baseUrl}/testcases/${key}/teststeps`,
      {
        mode: "OVERWRITE",
        items: tc.steps.map((s, i) => ({
          inline: {
            description: gwtSteps ? gwtSteps[i].description : s,
            expectedResult: tc.expected || ""
          }
        }))
      },
      { headers: zephyrHeaders() }
    );
  }

  return { id, key };
}

/**
 * GET /testcases/{testCaseKey}
 */
async function getTestCase(testCaseKey) {
  const res = await axios.get(
    `${config.zephyr.baseUrl}/testcases/${testCaseKey}`,
    { headers: zephyrHeaders() }
  );
  return res.data;
}

/**
 * PUT /testcases/{testCaseKey}
 */
async function updateTestCase(testCaseKey, fields) {
  await axios.put(
    `${config.zephyr.baseUrl}/testcases/${testCaseKey}`,
    fields,
    { headers: zephyrHeaders() }
  );
}

/**
 * DELETE /testcases/{testCaseKey}
 */
async function deleteTestCase(testCaseKey) {
  await axios.delete(
    `${config.zephyr.baseUrl}/testcases/${testCaseKey}`,
    { headers: zephyrHeaders() }
  );
}

/**
 * GET /testcases — search test cases by project
 */
async function searchTestCases(maxResults = 50, startAt = 0) {
  const res = await axios.get(
    `${config.zephyr.baseUrl}/testcases`,
    {
      headers: zephyrHeaders(),
      params: { projectKey: config.zephyr.projectKey, maxResults, startAt }
    }
  );
  return res.data;
}

module.exports = { createTestCase, getTestCase, updateTestCase, deleteTestCase, searchTestCases };
