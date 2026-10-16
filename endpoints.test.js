const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ENDPOINTS = require("./endpoints.js");

test("workshop catalog is served by the Cloudflare Worker", () => {
  assert.equal(ENDPOINTS.catalog, "https://hooks.breakshell.com/workshop-catalog");
});

test("endpoints not yet migrated still point at their n8n webhooks", () => {
  assert.equal(ENDPOINTS.registration, "https://darrenaitool.zeabur.app/webhook/workshop-registration");
  assert.equal(ENDPOINTS.attendee, "https://darrenaitool.zeabur.app/webhook/workshop-attendee");
  assert.equal(ENDPOINTS.bookingManage, "https://darrenaitool.zeabur.app/webhook/workshop-booking-manage");
  assert.equal(ENDPOINTS.feedback, "https://darrenaitool.zeabur.app/webhook/workshop-feedback");
  assert.equal(
    ENDPOINTS.discordClaimStart,
    "https://darrenaitool.zeabur.app/webhook/discord-claim-start-2a916bf2c3df4e04a54a0ac625662692",
  );
});

// 每個頁面都從 endpoints.js 拿網址：先載入它，頁面裡不得再寫死後端網址
for (const page of ["index.html", "manage.html", "feedback.html", "discord.html"]) {
  test(`${page} takes its backend URLs from endpoints.js`, () => {
    const html = fs.readFileSync(path.join(__dirname, page), "utf8");
    const loadsConfig = html.indexOf('<script src="./endpoints.js"></script>');
    assert.ok(loadsConfig >= 0, `${page} 沒有載入 endpoints.js`);
    assert.ok(loadsConfig < html.indexOf("ENDPOINTS."), `${page} 在載入 endpoints.js 之前就用了 ENDPOINTS`);
    assert.doesNotMatch(html, /zeabur\.app|hooks\.breakshell\.com/);
  });
}
