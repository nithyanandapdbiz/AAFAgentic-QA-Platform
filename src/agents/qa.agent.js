const { extractText } = require("./planner.agent");

/**
 * QA Agent — rule-based test case generator (no external AI required).
 *
 * Generates detailed test cases from a Jira story using structured templates
 * per test type. Each test case includes:
 *   title, description, designTechnique, steps[] (with test data), testData[],
 *   expected, priority, tags[]
 *
 * Design Techniques applied:
 *   EP  — Equivalence Partitioning  (happy-path, mandatory, invalid)
 *   BVA — Boundary Value Analysis   (boundary, max-records)
 *   EG  — Error Guessing            (special chars, duplicate, cancel)
 *   ST  — State Transition          (data persistence flow)
 *   UC  — Use Case / Scenario       (acceptance criteria, RBAC)
 *   DT  — Decision Table            (RBAC role combinations)
 */

// ── Template builders per test type ──────────────────────────────────
const TEMPLATES = [
  {
    build(subject) {
      return {
        title: `Verify successful ${subject} with valid inputs`,
        description: `Ensure that ${subject} completes successfully when all required fields are provided with valid data.`,
        designTechnique: "Equivalence Partitioning (EP) — Valid Partition",
        testData: [
          { field: "First Name", value: "AutoTest", partition: "Valid — alphabetic, 1–50 chars" },
          { field: "Last Name",  value: "Employee",  partition: "Valid — alphabetic, 1–50 chars" },
          { field: "Username",   value: "autotest01", partition: "Valid — alphanumeric, unique" }
        ],
        steps: [
          `[Pre-condition] User is logged out. Browser is open at the application URL.`,
          `Navigate to the application login page and log in with valid admin credentials (Username: Admin, Password: admin123).`,
          `Navigate to the ${subject} page or form via the main navigation menu.`,
          `Verify the form/page loads completely with all fields visible.`,
          `Fill in First Name field with valid test data: "AutoTest" (alphabetic, within 1–50 char limit).`,
          `Fill in Last Name field with valid test data: "Employee" (alphabetic, within 1–50 char limit).`,
          `Fill in any other required fields with valid test data as per test data table.`,
          `Click the Save / Submit button to trigger the action.`,
          `Wait for the system response (success message or redirect).`,
          `Verify a success confirmation message is displayed (e.g. "Successfully Saved").`,
          `Verify the system redirects to the expected page (e.g. employee detail view).`,
          `[Post-condition] Verify the new record appears in the list/search results.`
        ],
        expected: `${subject} completes successfully. A success message is displayed. Data is persisted and visible in the system. No errors occur.`,
        priority: "High",
        tags: ["happy-path", "smoke", "ep-valid"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify mandatory fields are enforced for ${subject}`,
        description: `Ensure the system prevents submission when required fields are empty.`,
        designTechnique: "Equivalence Partitioning (EP) — Empty/Null Partition",
        testData: [
          { field: "First Name", value: "", partition: "Invalid — empty string" },
          { field: "Last Name",  value: "", partition: "Invalid — empty string" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin.`,
          `Navigate to the ${subject} page or form.`,
          `Leave the First Name field completely empty (do not enter any value).`,
          `Leave the Last Name field completely empty (do not enter any value).`,
          `Leave any other mandatory fields empty.`,
          `Click the Save / Submit button without filling any required fields.`,
          `Observe all inline validation messages that appear below each empty field.`,
          `Verify the form does NOT submit (URL remains on the form page).`,
          `Verify the First Name field shows an error message (e.g. "Required").`,
          `Verify the Last Name field shows an error message (e.g. "Required").`,
          `[Negative check] Verify no partial record is created in the system.`
        ],
        expected: `Submission is blocked. Inline validation error messages appear for each required field. No data is saved. URL does not change to confirmation page.`,
        priority: "High",
        tags: ["validation", "negative", "required-fields", "ep-empty"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify ${subject} rejects invalid input data`,
        description: `Ensure the system shows appropriate errors when invalid values are submitted.`,
        designTechnique: "Equivalence Partitioning (EP) — Invalid Partition + Error Guessing (EG)",
        testData: [
          { field: "First Name", value: "12345",    partition: "Invalid — numerics only" },
          { field: "First Name", value: "!@#$%^&*", partition: "Invalid — special characters" },
          { field: "Last Name",  value: "<script>", partition: "Invalid — HTML injection attempt (EG)" },
          { field: "Username",   value: "a b c",    partition: "Invalid — spaces in username" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin. Navigate to ${subject} form.`,
          `Enter numeric-only value "12345" in the First Name field.`,
          `Enter special characters "!@#$%^&*" in the Last Name field.`,
          `Click Save / Submit and observe any validation errors shown.`,
          `Clear the fields and enter HTML injection attempt "<script>alert(1)</script>" in First Name.`,
          `Click Save / Submit and verify the system handles this without executing script.`,
          `Clear the fields and enter a value with spaces "John Doe Smith" in a username-type field.`,
          `Submit and observe system response (expect validation error or sanitised output).`,
          `Verify no system crash, 500 error, or unhandled exception occurs at any point.`,
          `[Post-condition] Confirm no invalid records were persisted in the database.`
        ],
        expected: `System displays descriptive validation errors for invalid inputs. No system errors or crashes occur. No invalid data is saved. HTML/script injection is neutralised.`,
        priority: "High",
        tags: ["negative", "invalid-data", "validation", "ep-invalid", "security-eg"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify boundary values are handled correctly for ${subject}`,
        description: `Test minimum, maximum, just-below-maximum, and just-over-maximum input lengths and numeric values.`,
        designTechnique: "Boundary Value Analysis (BVA) — Min, Min+1, Max-1, Max, Max+1",
        testData: [
          { field: "First Name", value: "A",            bva: "Min (1 char)" },
          { field: "First Name", value: "AB",           bva: "Min+1 (2 chars)" },
          { field: "First Name", value: "A".repeat(49), bva: "Max-1 (49 chars)" },
          { field: "First Name", value: "A".repeat(50), bva: "Max (50 chars)" },
          { field: "First Name", value: "A".repeat(51), bva: "Max+1 (51 chars) — should be rejected" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin. Navigate to ${subject} form.`,
          `[BVA-1] Enter minimum boundary value: single character "A" in First Name and "B" in Last Name. Submit and verify the form accepts it.`,
          `[BVA-2] Enter Min+1 boundary value: two characters "AB" in First Name. Submit and verify acceptance.`,
          `[BVA-3] Navigate back and enter Max-1 boundary value: 49-character string in First Name. Submit and verify acceptance.`,
          `[BVA-4] Navigate back and enter the exact maximum boundary: 50-character string in First Name. Submit and verify acceptance.`,
          `[BVA-5] Navigate back and enter Max+1 boundary: 51-character string in First Name. Submit and verify rejection with error message.`,
          `Record actual system behaviour for each boundary point in a table.`,
          `Verify that accepted boundary values are correctly persisted and displayed.`
        ],
        expected: `Min (1 char) and Max (50 chars) values are accepted and saved. Max+1 (51 chars) is rejected with a clear field-level error. Min-1 (0 chars / empty) is rejected as mandatory. System does not crash at any boundary.`,
        priority: "Normal",
        tags: ["boundary", "edge-case", "bva"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify duplicate ${subject} is prevented`,
        description: `Ensure the system does not allow creating duplicate records for ${subject}.`,
        designTechnique: "Error Guessing (EG) — Duplicate entry scenario",
        testData: [
          { field: "First Name", value: "DupeTest",  note: "Used for initial record creation" },
          { field: "Last Name",  value: "DupeUser",  note: "Same value used in second attempt" },
          { field: "Employee ID", value: "DUP001",   note: "Unique identifier being duplicated" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin.`,
          `Perform a successful ${subject}: Enter First Name "DupeTest", Last Name "DupeUser", save the record.`,
          `Note the generated employee ID or unique identifier: "DUP001".`,
          `Navigate back to the ${subject} form.`,
          `Attempt to create a second record with the exact same unique identifier "DUP001".`,
          `Click Save / Submit.`,
          `Observe the system response for the duplicate attempt.`,
          `Verify a duplicate-specific error message is displayed (e.g. "Employee ID already exists").`,
          `Verify only one record exists in the system for the tested identifier.`,
          `[Cleanup] Delete the test record created in step 2 if the system allows.`
        ],
        expected: `System detects the duplicate and displays a specific, actionable error message. No duplicate record is created in the database. The original record remains intact.`,
        priority: "Normal",
        tags: ["negative", "duplicate", "validation", "error-guessing"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify ${subject} handles special characters and unicode`,
        description: `Test that text fields correctly accept or reject special characters and unicode input.`,
        designTechnique: "Error Guessing (EG) — Special character and encoding edge cases",
        testData: [
          { field: "First Name", value: "José",       note: "Accented unicode character — should be accepted" },
          { field: "First Name", value: "王",          note: "CJK unicode character — verify handling" },
          { field: "First Name", value: "O'Brien",    note: "Apostrophe — common SQL injection vector (EG)" },
          { field: "First Name", value: "Test–Name",  note: "En-dash unicode character" },
          { field: "Last Name",  value: "Müller",     note: "Umlaut unicode — should be accepted" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin. Navigate to ${subject} form.`,
          `Enter First Name: "José" (unicode accented character). Submit and verify acceptance and correct storage/display.`,
          `Navigate back. Enter First Name: "O'Brien" (apostrophe). Submit and verify no SQL error occurs and data is stored correctly.`,
          `Navigate back. Enter Last Name: "Müller" (umlaut). Submit and verify the umlaut is preserved in the saved record.`,
          `Navigate back. Enter First Name: "王" (CJK character). Submit and observe system handling (accept or graceful reject).`,
          `For any accepted values: navigate to the employee profile and verify the displayed name matches exactly what was entered.`,
          `Verify no JavaScript errors, 500 errors, or database exceptions occur at any step.`
        ],
        expected: `Commonly accepted unicode (accented, umlaut) is stored and displayed correctly. Special chars like apostrophe are sanitised without causing injection. System never crashes or shows raw errors regardless of input.`,
        priority: "Normal",
        tags: ["edge-case", "special-characters", "unicode", "error-guessing"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify UI feedback messages are correct for ${subject}`,
        description: `Ensure success and error messages are displayed correctly after each action.`,
        designTechnique: "Use Case / Scenario-based (UC) — UI response verification",
        testData: [
          { action: "Valid save",    expectedMsg: "Successfully Saved" },
          { action: "Validation fail", expectedMsg: "Required field error" },
          { action: "Server error",  expectedMsg: "Error or retry prompt" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin. Navigate to ${subject} form.`,
          `[Positive] Complete a successful ${subject} with valid data (First Name: "UITest", Last Name: "User").`,
          `Verify the success toast / notification appears and reads "Successfully Saved" (or equivalent).`,
          `Verify the success message is visible for the expected duration, then disappears or has a dismiss option.`,
          `Verify the success message is free from spelling mistakes and grammatical errors.`,
          `[Negative] Submit the form with empty required fields.`,
          `Verify field-level error messages appear in red / highlighted styling.`,
          `Verify error messages are actionable (e.g. "First Name is required" not just "Error").`,
          `[Recovery] Fill valid data after seeing errors and re-submit.`,
          `Verify the form recovers cleanly, error messages clear, and success is shown.`
        ],
        expected: `Success messages are accurate, visible, and well-styled. Error messages are specific, actionable, and clear. The UI recovers correctly after error correction. No raw error codes or stack traces are shown to the user.`,
        priority: "Normal",
        tags: ["ui", "usability", "feedback", "use-case"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify cancel or discard action during ${subject}`,
        description: `Ensure that cancelling mid-way through ${subject} does not save any partial data.`,
        designTechnique: "State Transition (ST) — In-progress → Cancelled transition",
        testData: [
          { field: "First Name", value: "CancelTest", note: "Partially entered — will be discarded" },
          { field: "Last Name",  value: "Partial",     note: "Partially entered — will be discarded" }
        ],
        steps: [
          `[Pre-condition] User is logged in as Admin. Navigate to ${subject} form.`,
          `[State: Form Empty] Verify the form starts in an empty state.`,
          `[State: Partially Filled] Enter First Name: "CancelTest" and Last Name: "Partial" without submitting.`,
          `Without clicking Save, click the Cancel button (or navigate away using the browser Back button).`,
          `[State: Cancelled] Observe what happens — browser may show an "unsaved changes" warning.`,
          `If a warning appears, confirm the discard action.`,
          `[State: Returned] Verify the user is returned to the previous page or employee list.`,
          `Navigate to the employee list and search for "CancelTest". Verify no partial record exists.`,
          `Verify zero data was persisted from the cancelled form entry.`
        ],
        expected: `No data from the in-progress form is saved after cancel. The user is returned to a previous stable state. If an "unsaved changes" warning appeared, it functioned correctly. Record list shows no partial entry.`,
        priority: "Low",
        tags: ["cancel", "negative", "data-integrity", "state-transition"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify data is persisted correctly after ${subject}`,
        description: `Confirm that submitted data is accurately saved and can be retrieved.`,
        designTechnique: "State Transition (ST) — Created → Saved → Retrieved",
        testData: [
          { field: "First Name",  value: "PersistTest",  note: "Known value to verify after save" },
          { field: "Last Name",   value: "DataCheck",    note: "Known value to verify after save" },
          { field: "Middle Name", value: "Verify",       note: "Optional field to check persistence" }
        ],
        steps: [
          `[State: Pre-action] Count existing records before test (note the total).`,
          `Navigate to ${subject} form. Enter First Name: "PersistTest", Middle Name: "Verify", Last Name: "DataCheck".`,
          `Click Save. Verify success message appears.`,
          `[State: Record Created] Note the assigned employee ID or unique identifier.`,
          `Navigate away from the page to the employee list/dashboard.`,
          `[State: Navigated Away] Return to the employee list and search for "PersistTest".`,
          `Open the newly created record.`,
          `[State: Retrieved] Verify First Name = "PersistTest" (exact match, including case).`,
          `Verify Middle Name = "Verify" (exact match).`,
          `Verify Last Name = "DataCheck" (exact match).`,
          `Verify total record count increased by exactly 1 compared to pre-action count.`
        ],
        expected: `All submitted data (First Name, Middle Name, Last Name) is accurately stored. Retrieved values exactly match input values. Record count increases by 1. No data corruption or truncation occurs.`,
        priority: "High",
        tags: ["data-integrity", "persistence", "regression", "state-transition"]
      };
    }
  },
  {
    build(subject) {
      return {
        title: `Verify ${subject} with the maximum number of records`,
        description: `Test system performance and behaviour when approaching or at maximum data limits.`,
        designTechnique: "Boundary Value Analysis (BVA) — Volume / capacity boundary",
        testData: [
          { scenario: "Near limit",   recordCount: "100 records",  note: "Max-1 volume test" },
          { scenario: "At limit",     recordCount: "System max",   note: "Max volume test" },
          { scenario: "Over limit",   recordCount: "Max + 1",      note: "Max+1 — expect graceful error" }
        ],
        steps: [
          `[Pre-condition] Identify the system's maximum record limit for ${subject} (from documentation or config).`,
          `Create records up to near-maximum capacity (or use existing data if already near limit).`,
          `Attempt to perform ${subject} at the near-maximum threshold and verify normal behaviour.`,
          `Attempt to perform ${subject} at the exact maximum limit. Observe and document the response.`,
          `Attempt to perform ${subject} one record beyond the maximum limit.`,
          `Verify the system displays a meaningful limit-exceeded error message (not a crash or 500 error).`,
          `Verify system performance: page load, search, and save operations remain within acceptable time (< 5 seconds).`,
          `Verify the system does not create partial records or corrupt existing data at capacity boundary.`
        ],
        expected: `System handles maximum data load gracefully. Near-maximum and at-maximum operations succeed. Exceeding the limit triggers a clear, user-friendly error. Performance remains acceptable. No data corruption or system failure.`,
        priority: "Low",
        tags: ["performance", "boundary", "edge-case", "bva-volume"]
      };
    }
  }
];

// ── Design technique label helper ─────────────────────────────────────
function pickTechnique(tags) {
  if (tags.includes('bva'))               return 'Boundary Value Analysis (BVA)';
  if (tags.includes('ep-invalid'))        return 'Equivalence Partitioning (EP) — Invalid';
  if (tags.includes('ep-empty'))          return 'Equivalence Partitioning (EP) — Empty/Null';
  if (tags.includes('state-transition'))  return 'State Transition (ST)';
  if (tags.includes('error-guessing'))    return 'Error Guessing (EG)';
  if (tags.includes('use-case'))          return 'Use Case / Scenario (UC)';
  return 'Equivalence Partitioning (EP) — Valid';
}

// Keywords that activate a security/permissions test case
const SECURITY_KEYWORDS = ["role", "permission", "admin", "access", "authoris", "authoriz", "login", "password", "secure"];

async function generate(story, plan) {
  const fields  = story.fields || {};
  const summary = fields.summary || "story";
  const desc    = extractText(fields.description);
  const allText = `${summary} ${desc}`.toLowerCase();

  // Strip common Jira story filler to get a concise subject phrase
  const subject = summary
    .replace(/^(as a|i want to|so that|given|when|then|user story:|story:)\s*/i, "")
    .trim() || summary;

  // Derive applicable design techniques from the planner output
  const techniques = (plan && plan.designTechniques) || [];
  const techNote   = techniques.length > 0 ? `Techniques: ${techniques.join(', ')}` : '';

  const testCases = TEMPLATES.map(t => t.build(subject));

  // Annotate each test case with planner technique context if available
  if (techNote) {
    testCases.forEach(tc => {
      if (!tc.designTechnique) tc.designTechnique = pickTechnique(tc.tags || []);
      tc.plannerTechniques = techniques;
    });
  }

  // Conditionally add a security / RBAC test case
  if (SECURITY_KEYWORDS.some(k => allText.includes(k))) {
    testCases.push({
      title: `Verify role-based access control for ${subject}`,
      description: `Ensure only authorised roles can perform ${subject}. Uses Decision Table technique across role combinations.`,
      designTechnique: "Decision Table (DT) — Role × Permission matrix",
      testData: [
        { role: "Admin",          canPerform: true,  expectedResult: "Action succeeds" },
        { role: "ESS User",       canPerform: false, expectedResult: "Access denied / redirect" },
        { role: "Supervisor",     canPerform: false, expectedResult: "Access denied / redirect" },
        { role: "Not logged in",  canPerform: false, expectedResult: "Redirect to login" }
      ],
      steps: [
        `[Pre-condition] Identify all roles relevant to ${subject} (Admin, ESS User, Supervisor).`,
        `Log in as a user with the Admin role. Attempt to perform ${subject}. Verify the action succeeds.`,
        `Log out. Log in as an ESS User (no admin rights). Navigate to ${subject} page.`,
        `Verify the action is blocked — either the URL redirects, the button is disabled, or an "Access Denied" message shows.`,
        `Log out. Log in as a Supervisor role. Attempt the same action. Verify blocked as per role matrix.`,
        `Access the URL directly without being logged in — verify redirect to login page.`,
        `[Post-condition] Confirm no unauthorised actions were recorded in the system audit log.`
      ],
      expected: `Only Admin can perform ${subject}. All other roles are denied with a clear, appropriate message. No privilege escalation is possible.`,
      priority: "High",
      tags: ["security", "authorization", "rbac", "decision-table"]
    });
  }

  // Add acceptance-criteria test case if present in the story
  const ac = extractText(fields.customfield_10016) || extractText(fields.customfield_10014);
  if (ac && ac.trim().length > 10) {
    testCases.push({
      title: `Verify all acceptance criteria are met for ${subject}`,
      description: `End-to-end validation of the story against its defined acceptance criteria using Use Case / Scenario technique.`,
      designTechnique: "Use Case / Scenario-based (UC) — Acceptance Criteria validation",
      testData: [
        { criterion: ac.slice(0, 200), note: "As defined in the story" }
      ],
      steps: [
        `Review the acceptance criteria for the story: "${ac.slice(0, 200)}"`,
        `Map each acceptance criterion to a specific test condition and expected outcome.`,
        `Execute each acceptance criterion sequentially as an end-to-end scenario.`,
        `For each criterion: record Actual Result, compare to Expected, mark Pass/Fail.`,
        `Verify all acceptance criteria are satisfied simultaneously (no partial pass).`
      ],
      expected: `All acceptance criteria defined in the story are satisfied. Each criterion maps to a passing test condition.`,
      priority: "High",
      tags: ["acceptance-criteria", "regression", "use-case"]
    });
  }

  return testCases;
}

module.exports = { generate };
