const axios = require("axios");
const config = require("../core/config");
async function getStory(key){
  const res = await axios.get(`${config.jira.baseUrl}/rest/api/3/issue/${key}`, {
    auth: { username: config.jira.email, password: config.jira.token }
  });
  return res.data;
}
module.exports = { getStory };
