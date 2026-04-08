'use strict';
const axios = require("axios");
const config = require("../core/config");
const { zephyrHeaders } = require("../utils/zephyrJwt");

/**
 * Zephyr Essential Cloud API v2.8 — Test Executions
 *
 * POST /testexecutions          — create an execution (links testCase to cycle)
 * GET  /testexecutions/{id}     — get an execution
 * PUT  /testexecutions/{id}     — update status / comment
 * DELETE /testexecutions/{id}   — delete an execution
 * GET /testexecutions           — search executions by project/cycle/testCase
 *
 * Status name values: "Pass", "Fail", "In Progress", "Blocked", "Not Executed"
 */
async function createExecution(cycleKey, testCaseKey, statusName = "In Progress") {
  const res = await axios.post(
    `${config.zephyr.baseUrl}/testexecutions`,
    {
      projectKey: config.zephyr.projectKey,
      testCaseKey,
      testCycleKey: cycleKey,
      statusName
    },
    { headers: zephyrHeaders() }
  );
  return { id: res.data.id, key: testCaseKey };
}

async function updateExecution(executionId, statusName, comment = "") {
  const body = { statusName };
  if (comment) body.comment = comment;
  await axios.put(
    `${config.zephyr.baseUrl}/testexecutions/${executionId}`,
    body,
    { headers: zephyrHeaders() }
  );
}

async function getExecution(executionId) {
  const res = await axios.get(
    `${config.zephyr.baseUrl}/testexecutions/${executionId}`,
    { headers: zephyrHeaders() }
  );
  return res.data;
}

async function deleteExecution(executionId) {
  await axios.delete(
    `${config.zephyr.baseUrl}/testexecutions/${executionId}`,
    { headers: zephyrHeaders() }
  );
}

/**
 * Search executions — filter by cycleKey, testCaseKey, or project.
 */
async function searchExecutions({ cycleKey, testCaseKey, maxResults = 50, startAt = 0 } = {}) {
  const params = { projectKey: config.zephyr.projectKey, maxResults, startAt };
  if (cycleKey) params.testCycleKey = cycleKey;
  if (testCaseKey) params.testCaseKey = testCaseKey;
  const res = await axios.get(
    `${config.zephyr.baseUrl}/testexecutions`,
    { headers: zephyrHeaders(), params }
  );
  return res.data;
}

module.exports = { createExecution, updateExecution, getExecution, deleteExecution, searchExecutions };
