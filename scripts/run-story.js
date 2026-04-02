/**
 * run-story.js
 * Fetches a Jira user story and creates detailed test cases in Zephyr Essential Cloud API v2.8.
 *
 * Usage:
 *   node scripts/run-story.js              (uses ISSUE_KEY from .env)
 *   node scripts/run-story.js SCRUM-5      (override issue key)
 */
require("dotenv").config();

const fs   = require("fs");
const path = require("path");

const { getStory }       = require("../src/tools/jira.client");
const planner            = require("../src/agents/planner.agent");
const qa                 = require("../src/agents/qa.agent");
const reviewer           = require("../src/agents/reviewer.agent");
const { createTestCase, searchTestCases } = require("../src/tools/zephyr.client");

const ROOT = path.resolve(__dirname, "..");

const issueKey = process.argv[2] || process.env.ISSUE_KEY;

// ── helpers ────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const GREEN  = "\x1b[32m";
const CYAN   = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const DIM    = "\x1b[2m";

function header(text) {
  console.log(`\n${BOLD}${"─".repeat(54)}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${BOLD}${"─".repeat(54)}${RESET}`);
}

function step(icon, text) {
  console.log(`\n${CYAN}${icon}  ${text}${RESET}`);
}

function info(label, value) {
  console.log(`   ${DIM}${label}:${RESET} ${value}`);
}

// ── Cucumber feature file generator ───────────────────────────────
/**
 * Writes a .feature file for each test case.
 * Each scenario is tagged with its Zephyr key (@SCRUM-T36) and its labels.
 * Steps are written in Given/When/Then format using tc.gwt[].
 *
 * @param {Array}  testCases  - array of { title, gwt[], tags[], description }
 * @param {Array}  keys       - Zephyr keys in same order as testCases
 * @param {string} storyKey   - e.g. "SCRUM-6"
 * @param {string} storySummary - e.g. "User Login to OrangeHRM Application"
 */
function generateCucumberFeatures(testCases, keys, storyKey, storySummary) {
  const featuresDir = path.join(ROOT, "tests", "features", "employee");
  fs.mkdirSync(featuresDir, { recursive: true });

  const written = [];

  testCases.forEach((tc, idx) => {
    const zephyrKey = keys[idx];
    if (!zephyrKey || !tc.gwt) return;

    // Build tag line: @ZephyrKey + labels
    const labels = (tc.tags || []).filter(t => t !== storyKey.toLowerCase());
    const tagLine = [`@${zephyrKey}`, ...labels.map(l => `@${l}`)].join(' ');

    // Build GWT step lines
    const stepLines = tc.gwt.map(s => `    ${s.keyword} ${s.text}`).join('\n');

    const slug = zephyrKey.replace(/[^a-zA-Z0-9]/g, '_');
    const content =
`# =============================================================================
# Zephyr Test Case : ${zephyrKey}
# Story            : ${storyKey} — ${storySummary}
# Title            : ${tc.title}
# Design Technique : ${tc.designTechnique || ''}
# Labels           : ${(tc.tags || []).join(', ')}
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: ${zephyrKey} ${storySummary} — ${tc.title}

  Background:
    Given the browser is open at the OrangeHRM application

  ${tagLine}
  Scenario: ${tc.title}
${stepLines}
`;

    const filename = `${slug}_${tc.title
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60)
      .toLowerCase()}.feature`;
    const filePath = path.join(featuresDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    written.push({ zephyrKey, filename });
  });

  return written;
}

// ── main ────────────────────────────────────────────────────────────
(async () => {
  if (!issueKey) {
    console.error(`${RED}Error: No issue key provided. Set ISSUE_KEY in .env or pass as argument.${RESET}`);
    process.exit(1);
  }

  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║        Agentic QA — Story → Zephyr Test Cases         ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════╝${RESET}`);
  info("Issue", issueKey);
  info("Project", process.env.PROJECT_KEY);
  info("Zephyr", process.env.ZEPHYR_BASE_URL);

  // ── STEP 1: Fetch Jira Story ──────────────────────────────────────
  header("Step 1 — Fetch Jira Story");
  step("📥", `Fetching ${issueKey} from Jira...`);
  const story = await getStory(issueKey);
  const fields = story.fields || {};
  info("Summary", fields.summary || "(no summary)");
  info("Type",    fields.issuetype?.name || "?");
  info("Status",  fields.status?.name   || "?");
  info("Priority",fields.priority?.name || "?");

  // ── STEP 2: Plan ─────────────────────────────────────────────────
  header("Step 2 — Plan (AI)");
  step("🧠", "Analysing story to build a test plan...");
  const plan = await planner.plan(story);
  info("Scope",           plan.scope || "");
  info("Test Types",      (plan.testTypes || []).join(", "));
  info("Critical Scenarios", (plan.criticalScenarios || []).length + " identified");
  info("Risks",           (plan.risks || []).join(", ") || "none");

  // ── STEP 3: Generate Test Cases ───────────────────────────────────
  header("Step 3 — Generate Test Cases (AI)");
  step("⚙️ ", "Generating detailed test cases from story + plan...");
  const rawTestCases = await qa.generate(story, plan);
  info("Generated", `${rawTestCases.length} test cases`);

  // ── STEP 4: Review & Deduplicate ──────────────────────────────────
  header("Step 4 — Review & Deduplicate (AI)");
  step("🔍", "Reviewing test cases — removing duplicates, enriching steps...");
  const reviewed = await reviewer.review(rawTestCases);
  info("After review", `${reviewed.length} test cases`);

  // Tag each test case with the story key so we can filter later
  const storyLabel = issueKey.toLowerCase();
  const testCases = reviewed.map(tc => ({
    ...tc,
    tags: Array.from(new Set([...(tc.tags || []), storyLabel]))
  }));

  // ── STEP 4b: Zephyr dedup check ──────────────────────────────────
  header("Step 4b — Zephyr Dedup Check");
  step("🔍", "Checking Zephyr for existing test cases for this story...");
  const forceCreate = process.argv.includes("--force") || process.env.FORCE_CREATE === 'true';
  let toCreate = testCases;
  try {
    const existing = await searchTestCases(200);
    const existingNames = new Set(
      (existing.values || []).map(tc => (tc.name || "").toLowerCase().trim())
    );
    const alreadyExist = testCases.filter(tc => existingNames.has(tc.title.toLowerCase().trim()));
    // Collect the Zephyr keys of the already-existing test cases for this story
    const existingByName = new Map(
      (existing.values || []).map(tc => [(tc.name || "").toLowerCase().trim(), tc.key])
    );
    const existingKeys = alreadyExist
      .map(tc => existingByName.get(tc.title.toLowerCase().trim()))
      .filter(Boolean);
    if (alreadyExist.length > 0 && !forceCreate) {
      console.log(`\n   ${YELLOW}${alreadyExist.length} test case(s) already exist in Zephyr for this story:${RESET}`);
      alreadyExist.forEach(tc => console.log(`     ${DIM}↷ ${tc.title.slice(0, 60)}${RESET}`));
      toCreate = testCases.filter(tc => !existingNames.has(tc.title.toLowerCase().trim()));
      if (toCreate.length === 0) {
        console.log(`\n   ${GREEN}All ${testCases.length} test cases already present in Zephyr.${RESET}`);
        console.log(`   ${DIM}Pass --force to recreate them anyway.${RESET}\n`);
        // Write handoff file for generate-playwright.js
        fs.writeFileSync(
          path.join(ROOT, ".story-testcases.json"),
          JSON.stringify({ issueKey, keys: existingKeys }, null, 2)
        );
        info("Handoff written", `.story-testcases.json (${existingKeys.length} keys)`);
        try {
          const result = await searchTestCases(50);
          const total = result.total ?? (result.values || []).length;
          info("Total test cases in project", total);
        } catch (_) { /* informational only — ignore */ }
        // Generate Cucumber feature files from existing Zephyr TCs
        header("Step 5 — Generate Cucumber Feature Files (GWT)");
        step("🥒", "Writing .feature files from existing Zephyr test cases...");
        const storySummaryEarly = (story.fields || {}).summary || issueKey;
        // Re-order alreadyExist to align with existingKeys order
        const written = generateCucumberFeatures(alreadyExist, existingKeys, issueKey, storySummaryEarly);
        written.forEach(w => info(`  ${GREEN}✓${RESET} ${w.zephyrKey}`, w.filename));
        info("Feature files written", written.length);
        console.log(`\n${BOLD}${"═".repeat(54)}${RESET}\n`);
        process.exit(0);
      }
      info("New (not in Zephyr yet)", toCreate.length);
    } else if (forceCreate) {
      info("Force mode", `Will recreate all ${testCases.length} test cases`);
    } else {
      info("Existing count", `${(existing.values || []).length} in project — no duplicates found`);
    }
  } catch (e) {
    console.log(`   ${YELLOW}Could not check for duplicates: ${e.message} — proceeding with creation${RESET}`);
  }

  // ── STEP 5: Create in Zephyr ──────────────────────────────────────
  header("Step 5 — Create Test Cases in Zephyr");
  step("🚀", `Creating ${toCreate.length} test cases in Zephyr (project: ${process.env.PROJECT_KEY})...`);

  const created = [];
  const failed  = [];

  for (let i = 0; i < toCreate.length; i++) {
    const tc = toCreate[i];
    const num = `[${i + 1}/${toCreate.length}]`;
    process.stdout.write(`   ${num} "${tc.title.slice(0, 55)}" ... `);
    try {
      const { id, key } = await createTestCase(tc);
      console.log(`${GREEN}✓ ${key}${RESET}`);
      created.push({ id, key, title: tc.title, priority: tc.priority, steps: (tc.steps || []).length });
    } catch (err) {
      const msg = err.response
        ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data).slice(0, 100)}`
        : err.message;
      console.log(`${RED}✗ FAILED${RESET} — ${msg}`);
      failed.push({ title: tc.title, error: msg });
    }
  }

  // ── STEP 6: Summary ───────────────────────────────────────────────
  header("Summary");
  console.log(`\n  ${GREEN}${BOLD}Created: ${created.length}${RESET}  ${RED}Failed: ${failed.length}${RESET}\n`);

  if (created.length > 0) {
    console.log(`  ${BOLD}Created Test Cases:${RESET}`);
    created.forEach(tc => {
      console.log(`    ${GREEN}✓${RESET} ${BOLD}${tc.key}${RESET}  ${tc.title.slice(0, 50)}  ${DIM}[${tc.priority} | ${tc.steps} steps]${RESET}`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n  ${BOLD}Failures:${RESET}`);
    failed.forEach(f => console.log(`    ${RED}✗${RESET} ${f.title.slice(0, 50)} — ${f.error}`));
  }

  // ── STEP 7: Verify via GET ────────────────────────────────────────
  if (created.length > 0) {
    header("Step 6 — Verify in Zephyr");
    step("🔎", "Fetching test cases back from Zephyr to confirm...");
    try {
      const result = await searchTestCases(created.length + 5);
      const total = result.total ?? (result.values || []).length;
      info("Total test cases in project now", total);
      const createdKeys = new Set(created.map(c => c.key));
      const found = (result.values || []).filter(v => createdKeys.has(v.key));
      if (found.length > 0) {
        console.log(`\n   ${GREEN}${BOLD}Confirmed in Zephyr:${RESET}`);
        found.forEach(v => console.log(`     ${GREEN}✓${RESET} ${v.key} — ${v.name || v.title || ""}`));
      }
    } catch (e) {
      console.log(`   ${YELLOW}Could not verify (GET /testcases): ${e.message}${RESET}`);
    }
  }

  // Write handoff file for generate-playwright.js
  const allKeys = [
    ...(typeof existingKeys !== 'undefined' ? existingKeys : []),
    ...created.map(c => c.key)
  ];
  if (allKeys.length > 0) {
    fs.writeFileSync(
      path.join(ROOT, ".story-testcases.json"),
      JSON.stringify({ issueKey, keys: allKeys }, null, 2)
    );
    info("Handoff written", `.story-testcases.json (${allKeys.length} keys)`);
  }

  // Generate Cucumber feature files — map each created TC to its Zephyr key
  if (created.length > 0) {
    header("Step 7 — Generate Cucumber Feature Files (GWT)");
    step("🥒", `Writing .feature files for ${created.length} new test case(s)...`);
    const storySummaryFinal = (story.fields || {}).summary || issueKey;
    // Align toCreate with created keys (some may have failed, so filter by title)
    const createdByTitle = new Map(created.map(c => [c.title.toLowerCase(), c.key]));
    const alignedTCs   = toCreate.filter(tc => createdByTitle.has(tc.title.toLowerCase()));
    const alignedKeys  = alignedTCs.map(tc => createdByTitle.get(tc.title.toLowerCase()));
    const written = generateCucumberFeatures(alignedTCs, alignedKeys, issueKey, storySummaryFinal);
    written.forEach(w => console.log(`     ${GREEN}✓${RESET} ${w.zephyrKey}  ${DIM}${w.filename}${RESET}`));
    info("Feature files written", written.length);
  }

  console.log(`\n${BOLD}${"═".repeat(54)}${RESET}\n`);
  process.exit(failed.length > 0 ? 1 : 0);
})();
