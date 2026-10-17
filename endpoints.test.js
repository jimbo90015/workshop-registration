const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ENDPOINTS = require("./endpoints.js");

test("migrated endpoints are served by the Cloudflare Worker", () => {
  assert.equal(ENDPOINTS.catalog, "https://hooks.breakshell.com/workshop-catalog");
  assert.equal(ENDPOINTS.feedback, "https://hooks.breakshell.com/workshop-feedback");
  assert.equal(ENDPOINTS.discordClaimStart, "https://hooks.breakshell.com/discord-claim-start");
  assert.equal(ENDPOINTS.bookingManage, "https://hooks.breakshell.com/workshop-booking-manage");
  assert.equal(ENDPOINTS.attendee, "https://hooks.breakshell.com/workshop-attendee");
  assert.equal(ENDPOINTS.registration, "https://hooks.breakshell.com/workshop-registration");
});

test("no endpoint points at n8n any more", () => {
  for (const [name, url] of Object.entries(ENDPOINTS)) {
    assert.doesNotMatch(url, /zeabur\.app|\/webhook\//, `${name} 還指向 n8n`);
  }
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
