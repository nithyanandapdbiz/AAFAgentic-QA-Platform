const express = require("express");
const { getDashboard } = require("./dashboard.controller");
const router = express.Router();
router.get("/dashboard", getDashboard);
module.exports = router;
