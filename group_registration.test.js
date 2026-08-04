const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const GroupRegistration = require("./group_registration.js");

test("calculates companions from seats and organizer attendance", () => {
  assert.equal(GroupRegistration.requiredCompanionCount(2, true), 1);
  assert.equal(GroupRegistration.requiredCompanionCount(2, false), 2);
  assert.equal(GroupRegistration.requiredCompanionCount(10, true), 9);
  assert.equal(GroupRegistration.requiredCompanionCount(1, false), 0);
});

test("validates one unique identity for every companion seat", () => {
  assert.equal(GroupRegistration.validateCompanions({
    seatCount: 2,
    organizerAttends: true,
    organizerEmail: "Buyer@example.com ",
    companions: [{ name: "Guest", email: "guest@example.com" }],
  }).ok, true);

  assert.equal(GroupRegistration.validateCompanions({
    seatCount: 2,
    organizerAttends: true,
    organizerEmail: "buyer@example.com",
    companions: [{ name: "Buyer again", email: " BUYER@example.com " }],
  }).code, "DUPLICATE_ATTENDEE_EMAIL");

  assert.equal(GroupRegistration.validateCompanions({
    seatCount: 2,
    organizerAttends: false,
    organizerEmail: "buyer@example.com",
    companions: [{ name: "Only one", email: "one@example.com" }],
  }).code, "ATTENDEE_COUNT_MISMATCH");
});

test("registration page exposes organizer attendance and companion payload", () => {
  const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.match(page, /id="organizerAttends"/);
  assert.match(page, /id="companionFields"/);
  assert.match(page, /organizerAttends:/);
  assert.match(page, /companions:/);
  assert.match(page, /GroupRegistration\.validateCompanions/);
});

test("invite and booking management entry pages keep tokens in fragments", () => {
  for (const file of ["attendee.html", "manage.html"]) {
    const page = fs.readFileSync(path.join(__dirname, file), "utf8");
    assert.doesNotMatch(page, /location\.search.*token|searchParams\.get\(["']token/);
    assert.match(page, /location\.hash|fragmentToken/);
  }
});
