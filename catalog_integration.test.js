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

test("registration page asks every registrant for computer OS and AI subscription", () => {
  const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(page, /<select id="computerOS" required data-group="computerOS">/);
  assert.match(page, /<select id="aiSubscription" required data-group="aiSubscription">/);
  assert.match(page, /computerOS: \{ ph:true, other:false, items:\[/);
  assert.match(page, /aiSubscription: \{ ph:true, other:false, items:\[/);
  assert.match(page, /computerOS: \$\("computerOS"\)\.value/);
  assert.match(page, /aiSubscription: \$\("aiSubscription"\)\.value/);
  assert.match(page, /computerOS:payload\.computerOS/);
  assert.match(page, /aiSubscription:payload\.aiSubscription/);

  // 三語字典要齊全，切語言時才不會出現空字串
  for (const key of ["q_computerOS", "q_aiSubscription"]) {
    const entry = page.match(new RegExp(`${key}:\\s*\\{[^}]*\\}`));
    assert.ok(entry, `${key} 缺少 i18n 字典`);
    for (const lang of ["t:", "s:", "e:"]) {
      assert.ok(entry[0].includes(lang), `${key} 缺少 ${lang} 翻譯`);
    }
  }

  // "None" 已被 toolsUsed 佔用並在 n8n 映射成「沒用過」，訂閱題不得重用
  assert.doesNotMatch(page, /aiSubscription[\s\S]{0,240}\["None"/);
});
