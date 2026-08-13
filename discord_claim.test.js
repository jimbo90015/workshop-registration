const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pagePath = path.join(__dirname, "discord.html");
const page = fs.readFileSync(pagePath, "utf8");

test("Discord claim page keeps the claim secret in the URL fragment", () => {
  assert.match(page, /new URLSearchParams\(window\.location\.hash\.slice\(1\)\)/);
  assert.doesNotMatch(page, /window\.location\.search/);
  assert.match(page, /<meta name="referrer" content="no-referrer">/);
});

test("Discord claim starts only after an explicit button click", () => {
  assert.match(page, /continueButton\.addEventListener\("click", startClaim\)/);
  assert.doesNotMatch(page, /startClaim\(\);/);
});

test("Discord claim sends only the token to the claim-start webhook", () => {
  assert.match(page, /\/webhook\/discord-claim-start-[a-f0-9]{32}/);
  assert.match(page, /body: JSON\.stringify\(\{ token \}\)/);
  assert.match(page, /result\.ok !== true/);
  assert.match(page, /window\.location\.assign\(result\.authorizeUrl\)/);
});

test("Discord claim page rejects malformed tokens before network access", () => {
  assert.match(page, /\^\[a-f0-9\]\{64,128\}\$/i);
  assert.match(page, /if \(!token\)/);
  assert.match(page, /邀請連結不完整/);
});

test("Discord claim page explains that interrupted onboarding can be resumed", () => {
  assert.match(page, /加入完成前可重新開啟此連結/);
  assert.doesNotMatch(page, /只能使用一次/);
});
