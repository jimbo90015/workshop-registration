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

// 每個頁面都從 endpoints.js 拿網址：用到 ENDPOINTS 的頁面要先載入它，任何頁面都不得寫死後端網址
const pages = fs.readdirSync(__dirname).filter((name) => name.endsWith(".html"));

test("every page that calls a backend is checked", () => {
  for (const page of ["index.html", "manage.html", "feedback.html", "discord.html"]) {
    assert.ok(pages.includes(page), `${page} 不見了`);
    assert.match(fs.readFileSync(path.join(__dirname, page), "utf8"), /ENDPOINTS\./, `${page} 沒用 ENDPOINTS`);
  }
});

for (const page of pages) {
  test(`${page} takes its backend URLs from endpoints.js`, () => {
    const html = fs.readFileSync(path.join(__dirname, page), "utf8");
    assert.doesNotMatch(html, /zeabur\.app|breakshell\.com|workers\.dev|\/webhook\//);
    const firstUse = html.indexOf("ENDPOINTS.");
    if (firstUse < 0) return;
    const loadsConfig = html.indexOf('<script src="./endpoints.js"></script>');
    assert.ok(loadsConfig >= 0, `${page} 沒有載入 endpoints.js`);
    assert.ok(loadsConfig < firstUse, `${page} 在載入 endpoints.js 之前就用了 ENDPOINTS`);
  });
}
