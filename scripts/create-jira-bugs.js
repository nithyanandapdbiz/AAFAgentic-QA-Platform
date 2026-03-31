'use strict';
/**
 * create-jira-bugs.js — Auto Jira Bug Creator for Failed Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads test-results.json (and optionally test-results-healed.json), identifies
 * all remaining failing tests, and creates a Jira bug issue for each one.
 *
 * Each bug is:
 *   • Created under the configured PROJECT_KEY
 *   • Tagged with labels: auto-bug, playwright, qa-platform
 *   • Linked to the parent user story (ISSUE_KEY) via a "Relates" issue link
 *   • Has a structured ADF description with error details + spec file reference
 *
 * Usage:
 *   node scripts/create-jira-bugs.js
 *
 * Env vars required:
 *   JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN, PROJECT_KEY, ISSUE_KEY
 * Optional:
 *   JIRA_BUG_ISSUETYPE  (default: "Task")
 */

require('dotenv').config();
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const ROOT               = path.resolve(__dirname, '..');
const RESULTS_FILE       = path.join(ROOT, 'test-results.json');
const HEALED_RESULTS     = path.join(ROOT, 'test-results-healed.json');

const JIRA_URL    = (process.env.JIRA_URL || '').replace(/\/$/, '');
const JIRA_EMAIL  = process.env.JIRA_EMAIL;
const JIRA_TOKEN  = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.env.PROJECT_KEY || 'SCRUM';
const ISSUE_KEY   = process.env.ISSUE_KEY   || 'SCRUM-5';
const BUG_TYPE    = process.env.JIRA_BUG_ISSUETYPE || 'Task';

// ─── ANSI ─────────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
};

function jiraAuth() {
  return { username: JIRA_EMAIL, password: JIRA_TOKEN };
}

// ─── Collect all failing tests from a Playwright JSON result file ─────────────
function collectFailures(suites, parentFile = '') {
  const failures = [];
  for (const suite of (suites || [])) {
    const file = suite.file || parentFile;

    if (suite.suites && suite.suites.length) {
      failures.push(...collectFailures(suite.suites, file));
    }

    for (const spec of (suite.specs || [])) {
      let failed   = false;
      let errorMsg = '';

      for (const t of (spec.tests || [])) {
        for (const r of (t.results || [])) {
          if (r.status === 'failed' || r.status === 'timedOut') {
            failed   = true;
            errorMsg = r.error
              ? (r.error.message || (typeof r.error === 'string' ? r.error : JSON.stringify(r.error)))
              : '';
            break;
          }
        }
        if (failed) break;
      }

      if (failed) {
        failures.push({
          title: spec.title,
          error: String(errorMsg).slice(0, 800),
          file
        });
      }
    }
  }
  return failures;
}

// ─── Build an ADF (Atlassian Document Format) description ────────────────────
function buildDescription(failure) {
  return {
    type:    'doc',
    version: 1,
    content: [
      {
        type:    'paragraph',
        content: [{ type: 'text', text: 'Auto-created by Agentic QA Platform', marks: [{ type: 'strong' }] }]
      },
      {
        type:    'paragraph',
        content: [{ type: 'text', text: `Parent Story: ${ISSUE_KEY}` }]
      },
      { type: 'rule' },
      {
        type:    'heading',
        attrs:   { level: 3 },
        content: [{ type: 'text', text: 'Failed Test' }]
      },
      {
        type:    'paragraph',
        content: [{ type: 'text', text: failure.title }]
      },
      {
        type:    'heading',
        attrs:   { level: 3 },
        content: [{ type: 'text', text: 'Error Details' }]
      },
      {
        type:    'codeBlock',
        attrs:   { language: 'text' },
        content: [{ type: 'text', text: failure.error || 'No error message captured' }]
      },
      {
        type:    'heading',
        attrs:   { level: 3 },
        content: [{ type: 'text', text: 'Spec File' }]
      },
      {
        type:    'paragraph',
        content: [{ type: 'text', text: path.basename(failure.file || 'unknown') }]
      }
    ]
  };
}

// ─── Create a single Jira bug issue ──────────────────────────────────────────
async function createBug(failure) {
  const response = await axios.post(
    `${JIRA_URL}/rest/api/3/issue`,
    {
      fields: {
        project:     { key: PROJECT_KEY },
        summary:     `[Auto Bug] ${failure.title}`,
        description: buildDescription(failure),
        issuetype:   { name: BUG_TYPE },
        labels:      ['auto-bug', 'playwright', 'qa-platform']
      }
    },
    { auth: jiraAuth() }
  );
  return response.data;
}

// ─── Link bug issue to parent user story ─────────────────────────────────────
async function linkToParent(bugKey) {
  try {
    await axios.post(
      `${JIRA_URL}/rest/api/3/issueLink`,
      {
        type:         { name: 'Relates' },
        inwardIssue:  { key: bugKey },
        outwardIssue: { key: ISSUE_KEY }
      },
      { auth: jiraAuth() }
    );
  } catch (err) {
    const msg = err.response ? `HTTP ${err.response.status}` : err.message;
    console.log(`    ${C.dim}  Link to ${ISSUE_KEY} failed: ${msg} (bug still created)${C.reset}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║        Auto Jira Bug Creator                          ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════╝${C.reset}\n`);

  // ── Guard: credentials ──────────────────────────────────────────────────────
  if (!JIRA_URL || !JIRA_EMAIL || !JIRA_TOKEN) {
    console.log(`  ${C.yellow}⚠  Jira credentials not configured.${C.reset}`);
    console.log(`  ${C.dim}  Set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env to enable bug creation.${C.reset}\n`);
    return;
  }

  // ── Load results ────────────────────────────────────────────────────────────
  if (!fs.existsSync(RESULTS_FILE)) {
    console.log(`  ${C.yellow}⚠  test-results.json not found. Run tests first.${C.reset}\n`);
    return;
  }

  const raw      = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  let   failures = collectFailures(raw.suites || []);

  // If healed results exist, remove tests that passed after healing
  if (fs.existsSync(HEALED_RESULTS)) {
    try {
      const healedRaw   = JSON.parse(fs.readFileSync(HEALED_RESULTS, 'utf8'));
      const healedPassed = new Set();
      const gatherPassed = (suites) => {
        for (const s of (suites || [])) {
          gatherPassed(s.suites || []);
          for (const sp of (s.specs || [])) {
            if (sp.ok) healedPassed.add(sp.title);
          }
        }
      };
      gatherPassed(healedRaw.suites || []);
      const before = failures.length;
      failures = failures.filter(f => !healedPassed.has(f.title));
      if (before !== failures.length) {
        console.log(`  ${C.dim}  ${before - failures.length} test(s) excluded — already fixed by Healer.${C.reset}\n`);
      }
    } catch {
      // ignore parse errors on healed results
    }
  }

  if (failures.length === 0) {
    console.log(`  ${C.green}✓  No failing tests remain. No bugs to create.${C.reset}\n`);
    return;
  }

  console.log(`  ${C.yellow}Found ${failures.length} failing test(s). Creating Jira bugs linked to ${ISSUE_KEY}...\n${C.reset}`);

  const created = [];
  const errored = [];

  for (const failure of failures) {
    const label = failure.title.slice(0, 55);
    process.stdout.write(`  Creating: "${label}" ... `);

    try {
      const bug = await createBug(failure);
      await linkToParent(bug.key);
      console.log(`${C.green}✓ ${bug.key}${C.reset}`);
      created.push({ key: bug.key, title: failure.title });
    } catch (err) {
      const msg = err.response
        ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data).slice(0, 100)}`
        : err.message;
      console.log(`${C.red}✗ FAILED${C.reset} — ${msg}`);
      errored.push({ title: failure.title, error: msg });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}  Bug Creation Summary:${C.reset}`);
  console.log(`    ${C.green}Created : ${created.length}${C.reset}  ${C.red}Failed  : ${errored.length}${C.reset}\n`);

  if (created.length > 0) {
    console.log(`  ${C.bold}Created Bugs (linked to ${ISSUE_KEY}):${C.reset}`);
    for (const b of created) {
      console.log(`    ${C.green}✓${C.reset} ${C.bold}${b.key}${C.reset}  ${b.title.slice(0, 60)}`);
    }
    console.log('');
  }
}

main().catch(err => {
  console.error(`\n${C.red}  BUG CREATOR ERROR: ${err.message}${C.reset}\n`);
  process.exit(1);
});
