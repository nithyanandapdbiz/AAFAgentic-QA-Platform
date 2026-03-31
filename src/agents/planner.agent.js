/**
 * Planner Agent — rule-based (no external AI required).
 * Analyses a Jira story's text to produce a structured test plan:
 * scope, testTypes, designTechniques, criticalScenarios, and risks.
 *
 * Design Technique Selection:
 *   BVA  (Boundary Value Analysis)     — numeric fields, lengths, limits
 *   EP   (Equivalence Partitioning)    — input classes: valid / invalid / empty
 *   DT   (Decision Table)             — multiple condition combinations
 *   ST   (State Transition)           — multi-step flows, status changes
 *   EG   (Error Guessing)             — negative, security, edge cases
 *   UC   (Use Case / Scenario-based)  — end-to-end user journey tests
 */

// Keywords that indicate each test type applies
const TYPE_SIGNALS = {
  "Happy Path":     ["create", "add", "submit", "save", "login", "upload", "register", "complete", "update"],
  "Negative":       ["fail", "error", "invalid", "reject", "deny", "wrong", "missing", "not", "prevent"],
  "Edge Case":      ["empty", "null", "zero", "max", "min", "limit", "large", "special", "unicode", "blank"],
  "UI Validation":  ["field", "form", "input", "label", "button", "display", "screen", "page", "ui", "view"],
  "Security":       ["password", "auth", "permission", "access", "role", "admin", "token", "login", "secure"],
  "Boundary":       ["limit", "max", "min", "length", "count", "number", "size", "range", "character"],
  "Integration":    ["api", "sync", "service", "connect", "external", "third", "webhook", "email", "notification"]
};

// Design technique selection based on story content
const TECHNIQUE_SIGNALS = {
  "Boundary Value Analysis": ["limit", "max", "min", "length", "count", "number", "size", "range", "character", "boundary"],
  "Equivalence Partitioning": ["valid", "invalid", "input", "data", "field", "form", "value", "enter"],
  "Decision Table":           ["if", "when", "condition", "combination", "multiple", "and", "or", "role", "permission"],
  "State Transition":         ["status", "state", "flow", "step", "wizard", "transition", "from", "to", "stage", "workflow"],
  "Error Guessing":           ["fail", "error", "invalid", "crash", "null", "empty", "special", "unicode", "overflow", "injection"],
  "Use Case / Scenario":      ["user", "as a", "so that", "scenario", "journey", "end-to-end", "complete"]
};

// Risk patterns detected from keywords
const RISK_SIGNALS = [
  { keyword: "delete",   risk: "Data loss on accidental deletion" },
  { keyword: "password", risk: "Password storage or transmission vulnerability" },
  { keyword: "upload",   risk: "Malicious file upload or oversized payload" },
  { keyword: "email",    risk: "Invalid email format or duplicate registration" },
  { keyword: "role",     risk: "Privilege escalation or unauthorized access" },
  { keyword: "payment",  risk: "Financial data integrity and transaction failure" },
  { keyword: "search",   risk: "Injection through search inputs" },
  { keyword: "import",   risk: "Corrupt or incompatible file format handling" },
  { keyword: "export",   risk: "Sensitive data leakage in exported files" }
];

/** Recursively extracts plain text from Atlassian Document Format or plain string */
function extractText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(extractText).join(" ");
  if (node.content) return extractText(node.content);
  return "";
}

function lower(text) { return (text || "").toLowerCase(); }

async function plan(story) {
  const fields      = story.fields || {};
  const summary     = lower(fields.summary || "");
  const description = lower(extractText(fields.description));
  const ac          = lower(extractText(fields.customfield_10016) || extractText(fields.customfield_10014) || "");
  const allText     = `${summary} ${description} ${ac}`;

  // Determine applicable test types
  const testTypes = Object.entries(TYPE_SIGNALS)
    .filter(([, keywords]) => keywords.some(k => allText.includes(k)))
    .map(([type]) => type);
  if (testTypes.length === 0) testTypes.push("Happy Path", "Negative");

  // Determine applicable design techniques
  const designTechniques = Object.entries(TECHNIQUE_SIGNALS)
    .filter(([, keywords]) => keywords.some(k => allText.includes(k)))
    .map(([technique]) => technique);
  if (designTechniques.length === 0) designTechniques.push("Equivalence Partitioning", "Error Guessing");

  // Identify risks
  const risks = RISK_SIGNALS
    .filter(r => allText.includes(r.keyword))
    .map(r => r.risk);

  const criticalScenarios = [
    `Verify successful ${fields.summary || "operation"} with valid data`,
    `Verify system handles invalid or missing data gracefully`,
    `Verify UI feedback (success/error messages) is correct`
  ];

  return {
    scope: `Test all aspects of: ${fields.summary || "story"}`,
    testTypes,
    designTechniques,
    criticalScenarios,
    risks: risks.length > 0 ? risks : ["Unexpected system behaviour with boundary inputs"]
  };
}

module.exports = { plan, extractText };
