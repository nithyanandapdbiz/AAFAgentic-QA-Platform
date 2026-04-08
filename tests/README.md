# Tests

Playwright test framework using Page Object Model (POM) with Applitools Eyes visual testing.

## Structure

```
tests/
├── global-setup.js            # Playwright global setup (auth, browser warmup)
├── global-teardown.js         # Playwright global teardown (cleanup)
├── data/
│   └── testData.js            # Centralized test data, credentials, routes
├── fixtures/
│   └── base.fixture.js        # Composed fixture: POM + Eyes + ScreenshotHelper + hooks
├── helpers/
│   ├── eyes.helper.js         # Applitools EyesHelper (VisualGridRunner, check methods)
│   ├── screenshot.helper.js   # Step-based screenshot capture with Allure integration
│   └── locatorLoader.js       # YAML locator file parser for page objects
├── pages/                     # Page Object Model classes
│   ├── LoginPage.js           #   → Login page actions and assertions
│   ├── LoginPage.yml          #   → Login page locators (YAML)
│   ├── AddEmployeePage.js     #   → Add Employee form actions
│   ├── AddEmployeePage.yml    #   → Add Employee locators (YAML)
│   ├── EmployeeListPage.js    #   → Employee list/search actions
│   └── EmployeeListPage.yml   #   → Employee list locators (YAML)
└── specs/                     # Test specifications (auto-generated from Zephyr)
    └── SCRUM-T*.spec.js       # One spec per Zephyr test case
```

## Key Patterns

- **Page Object Model**: Each page has a `.js` class + `.yml` locator file
- **YAML Locators**: Selectors are externalized in YAML files, loaded by `locatorLoader.js`
- **Composed Fixtures**: `base.fixture.js` merges POM instances, Applitools Eyes, and ScreenshotHelper into a single import
- **Hook Lifecycle**: beforeEach (cookie clear), afterEach (failure screenshot + console errors), beforeAll/afterAll (suite logging)
- **Visual Testing**: Applitools Eyes auto-opens/closes per test via the `eyes` fixture; no-op when `APPLITOOLS_API_KEY` is unset

## Running Tests

```bash
npx playwright test                           # Run all specs
npx playwright test --grep "SCRUM-T53"        # Run specific test case
PW_HEADLESS=true npx playwright test          # Headless mode (CI)
```
