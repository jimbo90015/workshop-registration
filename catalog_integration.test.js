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
