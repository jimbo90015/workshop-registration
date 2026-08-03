# Registration Success Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect successful workshop registrations and notification signups to a localized, dedicated success page with a safe concise summary.

**Architecture:** Keep the existing static GitHub Pages structure. `index.html` writes an allowlisted success-state object to `sessionStorage` only after the webhook confirms success, then navigates to `success.html`; the new page validates and renders that state without placing personal data in the URL. Existing inline scripts and `node:test` source-contract tests remain the project pattern.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, browser `sessionStorage`, Node.js `node:test`, GitHub Pages.

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Submit the form; create the allowlisted success state after a confirmed webhook response; redirect to the success page. |
| `success.html` | Validate the stored state; render localized registration, notification, or fallback content; provide language controls and a return link. |
| `registration_success.test.js` | Protect the storage contract, redirect placement, localization coverage, safe rendering, and no-PII-in-URL requirements. |
| `docs/superpowers/specs/2026-08-03-registration-success-page-design.md` | Approved behavior and acceptance criteria; reference only. |

Do not modify `workshop_catalog.js`, `catalog_integration.test.js`, or webhook behavior.

### Task 1: Redirect confirmed submissions safely

**Files:**
- Create: `registration_success.test.js`
- Modify: `index.html:325-385`
- Modify: `index.html:679-739`

- [ ] **Step 1: Write the failing form-contract tests**

Create `registration_success.test.js` with the first test:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const formPage = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

test("confirmed submissions store a concise success state and redirect", () => {
  const responseGuard = formPage.indexOf("if (!res.ok || data.ok === false)");
  const stateWrite = formPage.indexOf("sessionStorage.setItem(SUCCESS_STORAGE_KEY");
  const catchBlock = formPage.indexOf("} catch (err)", responseGuard);

  assert.match(formPage, /const SUCCESS_STORAGE_KEY = "workshop_registration_success";/);
  assert.match(formPage, /function clearSuccessState\(\)/);
  assert.match(formPage, /window\.addEventListener\("pageshow", clearSuccessState\)/);
  assert.ok(stateWrite > responseGuard, "success state must be written after the response guard");
  assert.ok(stateWrite < catchBlock, "success state must be written in the confirmed-success path");
  assert.match(formPage, /window\.location\.assign\("\.\/success\.html"\)/);
});

test("success state allowlists only concise summary fields", () => {
  const start = formPage.indexOf("const successState = {");
  const end = formPage.indexOf("sessionStorage.setItem", start);
  const block = formPage.slice(start, end);

  assert.ok(start >= 0, "success state object must exist");
  for (const field of [
    "version", "intent", "lang", "email", "workshopName", "ticketName", "seatCount",
  ]) {
    assert.match(block, new RegExp(`\\b${field}\\b`));
  }
  for (const forbidden of [
    "workshopRecordId", "ticketPlanRecordId", "discountCode", "fullName", "phone",
    "messagingPlatform", "messagingId", "preferredChannel", "location", "customerType",
    "company", "city", "ageRange", "fieldOfStudy", "yearsToGraduation", "targetRoles",
    "aiExperience", "toolsUsed", "painPoints", "learningGoals", "productInterest",
    "leadSource", "referralPerson", "consentContact", "marketingConsent", "submittedAt",
  ]) {
    assert.doesNotMatch(block, new RegExp(`\\b${forbidden}\\b`));
  }
  assert.doesNotMatch(block, /\.\.\.payload|JSON\.stringify\(payload\)/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test registration_success.test.js
```

Expected: FAIL because `SUCCESS_STORAGE_KEY`, the success-state object, and the redirect do not exist.

- [ ] **Step 3: Add the storage key and remove obsolete success strings**

Near the webhook/catalog constants in `index.html`, add:

```js
const SUCCESS_STORAGE_KEY = "workshop_registration_success";
```

Remove `I18N.ok_msg` and `I18N.ok_notify`, because the form will no longer render success copy inline. Keep all error strings and `showStatus()` for validation and webhook failures.

- [ ] **Step 4: Clear stale state whenever the form page is shown**

Immediately after declaring `SUCCESS_STORAGE_KEY`, add:

```js
function clearSuccessState() {
  sessionStorage.removeItem(SUCCESS_STORAGE_KEY);
}
window.addEventListener("pageshow", clearSuccessState);
```

`pageshow` runs on the first load and when the browser restores the form from its back-forward cache. The old state is therefore cleared before native HTML validation can prevent a later `submit` event.

- [ ] **Step 5: Replace inline success handling with state creation and navigation**

After the existing response guard and before the `catch`, replace the `okText`, `showStatus`, form reset, and conditional-field reset block with:

```js
const selectedTicket = TICKET_PLANS.find(
  (plan) => plan.id === payload.ticketPlanRecordId,
);
const successState = {
  version: 1,
  intent: payload.intent,
  lang: LANG,
  email: payload.email,
  ...(payload.intent === "register" ? {
    workshopName: payload.workshopName,
    ticketName: selectedTicket?.name || selectedTicket?.ticketType || "",
    seatCount: payload.seatCount,
  } : {}),
};
sessionStorage.setItem(SUCCESS_STORAGE_KEY, JSON.stringify(successState));
window.location.assign("./success.html");
```

Do not reset the form on success; navigation leaves the page. Do not alter the existing `catch` or response guard.

- [ ] **Step 6: Run the focused and existing tests**

Run:

```bash
node --test registration_success.test.js catalog_integration.test.js
```

Expected: all tests PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add index.html registration_success.test.js
git commit -m "feat: redirect successful registrations"
```

### Task 2: Build the localized focused-confirmation page

**Files:**
- Create: `success.html`
- Modify: `registration_success.test.js`

- [ ] **Step 1: Add failing success-page contract tests**

Append to `registration_success.test.js`:

```js
const successPagePath = path.join(__dirname, "success.html");

test("success page supports registration, notification, and fallback states", () => {
  assert.ok(fs.existsSync(successPagePath), "success.html must exist");
  const page = fs.readFileSync(successPagePath, "utf8");

  assert.match(page, /workshop_registration_success/);
  assert.match(page, /state\.intent === "register"/);
  assert.match(page, /\["register", "notify"\]\.includes\(state\.intent\)/);
  assert.match(page, /copy\.notifyTitle/);
  assert.match(page, /renderFallback/);
  assert.match(page, /href="\.\/"/);
});

test("success page localizes all states without reading personal data from the URL", () => {
  const page = fs.readFileSync(successPagePath, "utf8");

  for (const lang of ["zh-Hant", "zh-Hans", "en"]) {
    assert.match(page, new RegExp(`"${lang}"`));
  }
  assert.match(page, /state\.lang/);
  assert.match(page, /localStorage\.setItem\("reg_lang", lang\)/);
  assert.match(page, /textContent/);
  assert.doesNotMatch(page, /\.innerHTML|\.outerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(page, /URLSearchParams|location\.search|location\.hash/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test registration_success.test.js
```

Expected: FAIL because `success.html` does not exist.

- [ ] **Step 3: Create the approved page structure and visual treatment**

Create `success.html` as a complete static document. Reuse the form’s tokens exactly:

```css
:root {
  --bg:#ece6dc; --card:#faf7f1; --field:#f2ece2; --border:#ded5c6;
  --fg:#33302b; --muted:#7d7567; --faint:#a69d8d;
  --accent:#e07b39; --accent-weak:#fbe7d7; --accent-fg:#ffffff;
  --ok:#1c9c8e; --ok-bg:#d8efeb;
  --ring:0 0 0 4px color-mix(in srgb, var(--accent) 24%, transparent);
  --shadow:0 1px 2px rgba(70,55,35,.05), 0 10px 34px rgba(70,55,35,.08);
}
```

The document must contain:

```html
<div class="wrap">
  <div class="topbar">
    <div class="langbar" aria-label="Language">
      <button type="button" data-lang="zh-Hant">繁體</button>
      <button type="button" data-lang="zh-Hans">简体</button>
      <button type="button" data-lang="en">EN</button>
    </div>
  </div>
  <div class="brand">
    <div class="logo" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.7L18.6 9.5l-4.7 1.8L12 16l-1.9-4.7L5.4 9.5l4.7-1.8z"/><path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7z"/></svg>
    </div>
    <span>AI Workshop</span>
  </div>
  <main class="success-card" aria-live="polite">
    <div class="success-icon" id="successIcon" aria-hidden="true">✓</div>
    <h1 id="title" tabindex="-1"></h1>
    <p class="lead" id="lead"></p>
    <section class="summary" id="summary" hidden>
      <h2 id="summaryTitle"></h2>
      <dl id="summaryRows"></dl>
    </section>
    <p class="next-step" id="nextStep"></p>
    <a class="primary-link" href="./" id="returnLink"></a>
  </main>
</div>
```

Match approved layout A: retain the form's sparkle logo treatment in the brand row, then use a centered checkmark and heading, concise left-aligned summary card, next-step copy, and full-width orange return button. At `max-width:520px`, reduce outer/card padding. Include visible `:focus-visible` styles and the existing reduced-motion media query.

- [ ] **Step 4: Add the state validator and initial-language rule**

In the page script, define the same key and validate only the documented contract:

```js
const SUCCESS_STORAGE_KEY = "workshop_registration_success";
const LANGS = ["zh-Hant", "zh-Hans", "en"];

function readState() {
  try {
    const state = JSON.parse(sessionStorage.getItem(SUCCESS_STORAGE_KEY) || "null");
    const valid = state
      && state.version === 1
      && ["register", "notify"].includes(state.intent)
      && LANGS.includes(state.lang)
      && typeof state.email === "string"
      && state.email.trim();
    return valid ? state : null;
  } catch (_) {
    return null;
  }
}

const state = readState();
let LANG = state?.lang || detectLang();
```

Registration-only fields are optional display fields: hide a row when its value is empty; do not turn an otherwise valid state into a fallback.

- [ ] **Step 5: Add complete three-language copy**

Create an `I18N` object keyed by `zh-Hant`, `zh-Hans`, and `en`. Each language must define:

```js
{
  registerTitle,
  registerLead,
  notifyTitle,
  notifyLead,
  summaryTitle,
  emailLabel,
  workshopLabel,
  ticketLabel,
  seatsLabel,
  seatsSuffix,
  registerNext,
  notifyNext,
  fallbackTitle,
  fallbackLead,
  returnLabel,
  pageTitle,
}
```

Use the approved meaning:

- Registration: successful; confirmation will be sent to the displayed email; check email for confirmation and course information.
- Notification: notification registered; new openings will be sent to the displayed email.
- Fallback: no recent registration details found; return to the form.

Do not say the email “has been sent.”

- [ ] **Step 6: Render with DOM APIs, not HTML interpolation**

Implement these small functions:

```js
function addRow(label, value) {
  if (value === undefined || value === null || value === "") return false;
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = String(value);
  $("summaryRows").append(term, detail);
  return true;
}

function renderSuccess(copy) {
  $("title").textContent = state.intent === "register" ? copy.registerTitle : copy.notifyTitle;
  $("lead").textContent = state.intent === "register" ? copy.registerLead : copy.notifyLead;
  $("nextStep").textContent = state.intent === "register" ? copy.registerNext : copy.notifyNext;
  $("summaryRows").replaceChildren();

  let hasRows = addRow(copy.emailLabel, state.email);
  if (state.intent === "register") {
    hasRows = addRow(copy.workshopLabel, state.workshopName) || hasRows;
    hasRows = addRow(copy.ticketLabel, state.ticketName) || hasRows;
    hasRows = addRow(copy.seatsLabel, state.seatCount ? `${state.seatCount} ${copy.seatsSuffix}` : "") || hasRows;
  }
  $("summary").hidden = !hasRows;
}

function renderFallback(copy) {
  $("successIcon").textContent = "i";
  $("title").textContent = copy.fallbackTitle;
  $("lead").textContent = copy.fallbackLead;
  $("summary").hidden = true;
  $("nextStep").textContent = "";
}
```

`setLang(lang)` must update `document.documentElement.lang`, `document.title`, active language-button state, `localStorage.setItem("reg_lang", lang)`, `summaryTitle.textContent`, `returnLink.textContent`, and then call `renderSuccess` or `renderFallback`. Call `$("title").focus()` once after initial rendering.

- [ ] **Step 7: Run the focused tests**

Run:

```bash
node --test registration_success.test.js
```

Expected: all success-page tests PASS.

- [ ] **Step 8: Run the complete test suite**

Run:

```bash
node --test *.test.js
```

Expected: all tests PASS with no skipped or failing tests.

- [ ] **Step 9: Commit Task 2**

```bash
git add success.html registration_success.test.js
git commit -m "feat: add localized registration success page"
```

### Task 3: Verify the end-to-end browser story

**Files:**
- Modify only if verification exposes a defect: `index.html`, `success.html`, `registration_success.test.js`

- [ ] **Step 1: Start a local static server**

Run from the worktree root:

```bash
python3 -m http.server 4173
```

Expected: static site available at `http://localhost:4173/`.

- [ ] **Step 2: Verify registration success rendering without calling production**

In the browser console for `http://localhost:4173/`, run:

```js
sessionStorage.setItem("workshop_registration_success", JSON.stringify({
  version: 1,
  intent: "register",
  lang: "zh-Hant",
  email: "test@example.com",
  workshopName: "AI Agent Workshop - London",
  ticketName: "Standard Ticket",
  seatCount: 1,
}));
location.assign("./success.html");
```

Expected: layout A appears with the four summary rows, Traditional Chinese copy, and no email in the address bar.

- [ ] **Step 3: Verify notification and fallback rendering**

Set a `notify` state with English, reload `success.html`, and verify ticket rows are absent. Then remove the storage key and reload.

Expected: notification copy in English; after removal, fallback copy and return link with no success claim.

- [ ] **Step 4: Verify language and responsive behavior**

Switch among all three languages. Inspect at desktop width and at `375px` width.

Expected: copy, page title, and active language control update; no horizontal overflow; keyboard focus is visible; reduced-motion preference disables animation.

- [ ] **Step 5: Verify the real submit branch without creating duplicate production data**

Use browser request interception or a temporary local `fetch` stub to return `{ "ok": true }` for the registration webhook. Submit the form with local test catalog data or directly exercise the submit handler.

Expected: the state is written only after the mocked success response and navigation goes to `success.html`. Repeat with a mocked non-2xx response.

Expected failure behavior: remain on the form, preserve entered values, and show the localized inline error.

Do not submit test records to the production webhook.

- [ ] **Step 6: Re-run tests and inspect the diff**

Run:

```bash
node --test *.test.js
git diff master...HEAD --check
git status --short
```

Expected: all tests PASS; diff check emits no whitespace errors; only planned files and commits appear.

- [ ] **Step 7: Commit any verification-only fixes**

Only if Step 2-6 required changes:

```bash
git add index.html success.html registration_success.test.js
git commit -m "fix: polish registration success flow"
```

If no files changed, do not create an empty commit.
