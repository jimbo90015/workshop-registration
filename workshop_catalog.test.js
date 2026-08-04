const assert = require("node:assert/strict");
const test = require("node:test");

const {
  publicWorkshops,
  publicTicketPlans,
  isSeatCountAllowed,
  workshopDisplay,
} = require("./workshop_catalog.js");

test("formats Lark workshop dates in Europe/London", () => {
  for (const [timestamp, expected] of [
    [1782514800000, "2026/06/27"],
    [1783728000000, "2026/07/11"],
    [1786748400000, "2026/08/15"],
  ]) {
    assert.equal(workshopDisplay({ date: timestamp }), expected);
  }
});

test("keeps only current workshops unless catch-up registration is enabled", () => {
  const records = [
    { record_id: "old", fields: { "場次狀態": "開放報名", "日期": 1782514800000 } },
    { record_id: "catch-up", fields: { "場次狀態": "開放報名", "日期": 1783728000000, "允許過期補登": true } },
    { record_id: "future", fields: { "場次狀態": "開放報名", "日期": 1786748400000 } },
  ];

  assert.deepEqual(
    publicWorkshops(records, Date.parse("2026-08-04T12:00:00Z")).map((item) => item.id),
    ["catch-up", "future"],
  );
});

test("uses ticket type and validates group seat limits", () => {
  const [plan] = publicTicketPlans([{
    record_id: "group",
    fields: {
      "票價方案": "London 早鳥票",
      "工作坊場次": { link_record_ids: ["workshop"] },
      "票種": "團體票",
      "單價": 72,
      "幣別": "GBP",
      "狀態": "開放販售",
      "每單最少席位": 2,
      "每單最多席位": 10,
    },
  }]);

  assert.equal(plan.ticketType, "團體票");
  assert.equal(plan.unitPrice * 2, 144);
  assert.equal(isSeatCountAllowed(plan, 1), false);
  assert.equal(isSeatCountAllowed(plan, 2), true);
  assert.equal(isSeatCountAllowed(plan, 10), true);
  assert.equal(isSeatCountAllowed(plan, 11), false);
});
