const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const formPage = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

test("confirmed submissions store a concise success state and redirect", () => {
  const responseGuard = formPage.indexOf("if (!res.ok || data.ok === false)");
  const stateWrite = formPage.indexOf("sessionStorage.setItem(SUCCESS_STORAGE_KEY");
  const catchBlock = formPage.indexOf("    } catch (err) {", stateWrite);

  assert.match(
    formPage,
    /const SUCCESS_STORAGE_KEY = "workshop_registration_success";/,
  );
  assert.match(formPage, /function clearSuccessState\(\)/);
  assert.match(formPage, /window\.addEventListener\("pageshow", clearSuccessState\);/);
  assert.ok(responseGuard >= 0, "expected the existing response guard");
  assert.ok(stateWrite > responseGuard, "success state must follow the response guard");
  assert.ok(catchBlock > stateWrite, "success state must be written before catch");
  assert.match(formPage, /window\.location\.assign\("\.\/success\.html"\);/);
});

test("success state allowlists only concise summary fields", () => {
  const successState = formPage.match(
    /const successState = \{([\s\S]*?)sessionStorage\.setItem/,
  );

  assert.ok(successState, "expected a success state written to session storage");
  const stateSource = successState[0];

  [
    "version: 1",
    "intent: payload.intent",
    "lang: LANG",
    "email: payload.email",
    "workshopName: payload.workshopName",
    'ticketName: selectedTicket?.name || selectedTicket?.ticketType || ""',
    "seatCount: payload.seatCount",
  ].forEach((field) => assert.ok(stateSource.includes(field), `missing ${field}`));

  [
    "workshopRecordId",
    "ticketPlanRecordId",
    "formLang",
    "discountCode",
    "fullName",
    "phone",
    "messagingPlatform",
    "messagingId",
    "preferredChannel",
    "location",
    "customerType",
    "company",
    "city",
    "ageRange",
    "fieldOfStudy",
    "yearsToGraduation",
    "targetRoles",
    "aiExperience",
    "toolsUsed",
    "painPoints",
    "learningGoals",
    "productInterest",
    "leadSource",
    "referralPerson",
    "consentContact",
    "marketingConsent",
    "submittedAt",
  ].forEach((field) => assert.doesNotMatch(stateSource, new RegExp(`\\b${field}\\b`)));
  assert.doesNotMatch(stateSource, /\.\.\.payload/);
  assert.doesNotMatch(stateSource, /JSON\.stringify\(payload\)/);
});
