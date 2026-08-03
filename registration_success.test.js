const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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

const successPagePath = path.join(__dirname, "success.html");
const readSuccessPage = () => fs.readFileSync(successPagePath, "utf8");

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.hidden = false;
    this.listeners = new Map();
    this.attributes = new Map();
    this.className = "";
    this.textContent = "";
    this.classNames = new Set();
    this.classList = {
      add: (name) => this.classNames.add(name),
      remove: (name) => this.classNames.delete(name),
      contains: (name) => this.classNames.has(name),
      toggle: (name, force) => {
        if (force === undefined) force = !this.classNames.has(name);
        if (force) this.classNames.add(name);
        else this.classNames.delete(name);
        return force;
      },
    };
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  focus() {
    this.focused = true;
  }

  click() {
    this.listeners.get("click")?.();
  }
}

function createStorage(values = {}) {
  const entries = new Map(Object.entries(values));
  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    },
  };
}

function runSuccessPage({ state, rawState, browserLang = "en-US", savedLang } = {}) {
  const elements = Object.fromEntries(
    ["title", "successIcon", "lead", "summary", "summaryTitle", "summaryRows", "nextStep", "returnLink"]
      .map((id) => [id, new FakeElement()]),
  );
  const languageButtons = ["zh-Hant", "zh-Hans", "en"].map((lang) => {
    const button = new FakeElement("button");
    button.dataset.lang = lang;
    return button;
  });
  const storedState = rawState === undefined
    ? state === undefined ? undefined : JSON.stringify(state)
    : rawState;
  const sessionStorage = createStorage(
    storedState === undefined ? {} : { workshop_registration_success: storedState },
  );
  const localStorage = createStorage(savedLang ? { reg_lang: savedLang } : {});
  const document = {
    documentElement: { lang: "zh-Hant" },
    title: "AI Workshop",
    getElementById(id) {
      return elements[id];
    },
    querySelectorAll(selector) {
      return selector === ".langbar button" ? languageButtons : [];
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  const script = readSuccessPage().match(/<script>([\s\S]*?)<\/script>/)[1];

  vm.runInNewContext(script, { document, sessionStorage, localStorage, navigator: { language: browserLang } });
  return { document, elements, languageButtons, localStorage };
}

function cssRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `expected CSS rule for ${selector}`);
  return match[1];
}

function cssProperty(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  assert.ok(match, `expected ${property} declaration`);
  return match[1].trim();
}

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.slice(1).match(/../g).map((channel) => Number.parseInt(channel, 16) / 255);
    const [red, green, blue] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("success page exists", () => {
  assert.ok(fs.existsSync(successPagePath), "expected success.html to exist");
});

test("success page reads the concise registration state", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /const SUCCESS_STORAGE_KEY = "workshop_registration_success";/);
  assert.match(successPage, /state\.intent === "register"/);
  assert.match(successPage, /\["register", "notify"\]\.includes\(state\.intent\)/);
});

test("success page renders notification and fallback states", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /copy\.notifyTitle/);
  assert.match(successPage, /function renderFallback\(\)/);
});

test("success page uses a semantic summary heading", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /<h2[^>]*id="summaryTitle"[^>]*>/);
  assert.match(successPage, /<dl id="summaryRows"><\/dl>/);
});

test("success page gives fallback content a neutral icon", () => {
  const successPage = readSuccessPage();
  const fallbackSource = successPage.slice(
    successPage.indexOf("function renderFallback()"),
    successPage.indexOf("function setLang()"),
  );

  assert.match(fallbackSource, /successIcon\.textContent = "i";/);
  assert.match(fallbackSource, /successIcon\.classList\.add\("fallback-icon"\);/);
  assert.match(successPage, /\.success-icon\.fallback-icon\{[^}]*background:var\(--field\);[^}]*color:var\(--muted\);/);
});

test("success page uses a non-success document title for fallback", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /document\.title = state \? copy\.pageTitle : copy\.fallbackTitle;/);
});

test("success page restores the success icon for valid states", () => {
  const successPage = readSuccessPage();
  const successSource = successPage.slice(
    successPage.indexOf("function renderSuccess()"),
    successPage.indexOf("function renderFallback()"),
  );

  assert.match(successSource, /successIcon\.textContent = "✓";/);
  assert.match(successSource, /successIcon\.classList\.remove\("fallback-icon"\);/);
});

test("success page keeps navigation relative and all languages complete", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /href="\.\/"/);
  ["zh-Hant", "zh-Hans", "en"].forEach((lang) => {
    assert.match(successPage, new RegExp(`["']${lang}["']:\\s*\\{`));
  });
});

test("success page starts in the saved submission language", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /state\?\.lang \|\| detectLang\(\)/);
});

test("success page persists language choices", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /localStorage\.setItem\("reg_lang", lang\)/);
});

test("success page renders stored data without HTML sinks", () => {
  const successPage = readSuccessPage();

  assert.match(successPage, /\.textContent\s*=/);
  [".innerHTML", ".outerHTML", "insertAdjacentHTML", "document.write"].forEach((sink) => {
    assert.ok(!successPage.includes(sink), `must not use ${sink}`);
  });
});

test("success page never reads URL state", () => {
  const successPage = readSuccessPage();

  ["URLSearchParams", "location.search", "location.hash"].forEach((source) => {
    assert.ok(!successPage.includes(source), `must not read ${source}`);
  });
});

test("success page uses AA-contrast warm text and control colors", () => {
  const successPage = readSuccessPage();
  const tokens = Object.fromEntries(
    [...successPage.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, name, color]) => [name, color]),
  );
  const colorFrom = (value) => {
    const token = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    assert.ok(token, `expected token color, got ${value}`);
    assert.ok(tokens[token], `missing ${token}`);
    return tokens[token];
  };
  const checks = [
    [cssRule(successPage, ".return-link"), "color", cssRule(successPage, ".return-link"), "background"],
    [cssRule(successPage, ".langbar button.active"), "color", cssRule(successPage, ".langbar button.active"), "background"],
    [cssRule(successPage, ".summary-title"), "color", cssRule(successPage, ".summary"), "background"],
    [cssRule(successPage, ".lead"), "color", cssRule(successPage, ".success-card"), "background"],
    [cssRule(successPage, ".langbar button"), "color", cssRule(successPage, ".langbar"), "background"],
    [cssRule(successPage, "dt"), "color", cssRule(successPage, ".summary"), "background"],
  ];

  checks.forEach(([foregroundRule, foregroundProperty, backgroundRule, backgroundProperty]) => {
    const foreground = colorFrom(cssProperty(foregroundRule, foregroundProperty));
    const background = colorFrom(cssProperty(backgroundRule, backgroundProperty));
    assert.ok(contrastRatio(foreground, background) >= 4.5, `${foreground} on ${background} must meet AA contrast`);
  });
});

test("success page gives keyboard focus a high-contrast opaque outline", () => {
  const successPage = readSuccessPage();
  const tokens = Object.fromEntries(
    [...successPage.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, name, color]) => [name, color]),
  );
  const focus = tokens["--focus"];

  assert.ok(focus, "expected a dedicated focus token");
  ["--bg", "--field", "--accent-weak", "--card"].forEach((background) => {
    assert.ok(contrastRatio(focus, tokens[background]) >= 3, `${focus} on ${tokens[background]} must meet focus contrast`);
  });
  [".langbar button:focus-visible", ".primary-link:focus-visible"].forEach((selector) => {
    const rule = cssRule(successPage, selector);
    assert.equal(cssProperty(rule, "outline"), "3px solid var(--focus)");
    assert.equal(cssProperty(rule, "outline-offset"), "3px");
  });
});

test("success page wraps the summary email value", () => {
  const successPage = readSuccessPage();

  assert.match(cssRule(successPage, "dd"), /overflow-wrap:anywhere;/);
  assert.match(successPage, /\.lead\{[^}]*overflow-wrap:anywhere;/);
});

test("success page renders valid registration details at runtime", () => {
  const email = "extremely.long.local.verification.address-that-must-wrap.without-horizontal-overflow@example-workshop-registration.test";
  const { elements, document } = runSuccessPage({
    state: {
      version: 1,
      intent: "register",
      lang: "en",
      email,
      workshopName: "AI Fundamentals",
      ticketName: "Standard",
      seatCount: 2,
    },
  });

  assert.equal(document.title, "AI Workshop registration complete");
  assert.equal(elements.title.textContent, "Registration complete");
  assert.equal(elements.successIcon.textContent, "✓");
  assert.deepEqual(
    elements.summaryRows.children.map((row) => row.children.map((cell) => cell.textContent)),
    [["Email", email], ["Workshop", "AI Fundamentals"], ["Ticket", "Standard"], ["Seats", "2 seats"]],
  );
  assert.doesNotMatch(elements.lead.textContent, new RegExp(email));
  assert.equal(
    [elements.lead.textContent, ...elements.summaryRows.children.flatMap((row) => row.children.map((cell) => cell.textContent))]
      .join(" ").split(email).length - 1,
    1,
  );
});

test("success page keeps notification email in the summary instead of the lead", () => {
  const email = "extremely.long.local.verification.address-that-must-wrap.without-horizontal-overflow@example-workshop-registration.test";
  const { elements, document } = runSuccessPage({
    state: { version: 1, intent: "notify", lang: "en", email },
  });

  assert.equal(document.title, "AI Workshop registration complete");
  assert.equal(elements.title.textContent, "Notification request received");
  assert.equal(elements.summary.hidden, false);
  assert.deepEqual(
    elements.summaryRows.children.map((row) => row.children.map((cell) => cell.textContent)),
    [["Email", email]],
  );
  assert.doesNotMatch(elements.lead.textContent, new RegExp(email));
  assert.equal(
    [elements.lead.textContent, ...elements.summaryRows.children.flatMap((row) => row.children.map((cell) => cell.textContent))]
      .join(" ").split(email).length - 1,
    1,
  );
});

test("success page renders neutral fallback content for missing or malformed state at runtime", () => {
  [undefined, { version: 1, intent: "register", lang: "en", email: "" }].forEach((state) => {
    const { elements, document } = runSuccessPage({ state });

    assert.equal(document.title, "No recent registration details found");
    assert.equal(elements.title.textContent, "No recent registration details found");
    assert.equal(elements.successIcon.textContent, "i");
    assert.equal(elements.successIcon.classList.contains("fallback-icon"), true);
  });
});

test("success page renders neutral fallback content for malformed JSON at runtime", () => {
  assert.doesNotThrow(() => {
    const { elements, document } = runSuccessPage({ rawState: "{not-json" });

    assert.equal(document.title, "No recent registration details found");
    assert.equal(elements.title.textContent, "No recent registration details found");
    assert.equal(elements.successIcon.textContent, "i");
    assert.equal(elements.successIcon.classList.contains("fallback-icon"), true);
  });
});

test("success page rerenders and persists language changes at runtime", () => {
  const { elements, languageButtons, localStorage } = runSuccessPage({
    state: { version: 1, intent: "notify", lang: "zh-Hant", email: "person@example.com" },
  });

  languageButtons.find((button) => button.dataset.lang === "en").click();

  assert.equal(elements.title.textContent, "Notification request received");
  assert.equal(elements.returnLink.textContent, "Return to registration form");
  assert.equal(localStorage.getItem("reg_lang"), "en");
});
