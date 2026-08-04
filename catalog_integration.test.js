const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("registration page loads its workshop options from the public catalog", () => {
  const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(page, /workshop_catalog\.js/);
  assert.match(page, /workshop-catalog/);
  assert.match(page, /async function loadWorkshops/);
  assert.doesNotMatch(page, /recvp14KDuYGjm/);
});

test("registration page collects a ticket plan, seat count, and discount code", () => {
  const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(page, /id="ticketPlan"/);
  assert.match(page, /id="seatCount"/);
  assert.match(page, /id="discountCode"/);
  assert.match(page, /ticketPlanRecordId/);
  assert.match(page, /seatCount/);
  assert.match(page, /discountCode/);
  assert.match(page, /publicTicketPlans/);
  assert.match(page, /plan\.ticketType/);
  assert.doesNotMatch(page, /plan\.name \|\| plan\.ticketType/);
  assert.match(page, /isSeatCountAllowed/);
});
