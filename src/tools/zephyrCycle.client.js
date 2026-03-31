const axios = require("axios");
const config = require("../core/config");
const { zephyrHeaders } = require("../utils/zephyrJwt");

/**
 * Zephyr Essential Cloud API v2.8 — Test Cycles
 *
 * POST /testcycles          — create a cycle, returns { id, key }
 * GET  /testcycles/{key}    — get a cycle by key
 * PUT  /testcycles/{key}    — update a cycle
 * DELETE /testcycles/{key}  — delete a cycle
 */
async function createTestCycle(name, description = "") {
  const res = await axios.post(
    `${config.zephyr.baseUrl}/testcycles`,
    {
      projectKey: config.zephyr.projectKey,
      name,
      description
    },
    { headers: zephyrHeaders() }
  );
  return { id: res.data.id, key: res.data.key };
}

async function getTestCycle(cycleKey) {
  const res = await axios.get(
    `${config.zephyr.baseUrl}/testcycles/${cycleKey}`,
    { headers: zephyrHeaders() }
  );
  return res.data;
}

async function updateTestCycle(cycleKey, fields) {
  await axios.put(
    `${config.zephyr.baseUrl}/testcycles/${cycleKey}`,
    fields,
    { headers: zephyrHeaders() }
  );
}

async function deleteTestCycle(cycleKey) {
  await axios.delete(
    `${config.zephyr.baseUrl}/testcycles/${cycleKey}`,
    { headers: zephyrHeaders() }
  );
}

module.exports = { createTestCycle, getTestCycle, updateTestCycle, deleteTestCycle };
