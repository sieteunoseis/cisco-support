const assert = require("assert");

let passed = 0, failed = 0, total = 0;
function describe(name, fn) { console.log(`  ${name}`); fn(); }
function it(name, fn) {
  total++;
  try { fn(); console.log(`    \u2713 ${name}`); passed++; }
  catch (e) { console.log(`    \u2717 ${name}: ${e.message}`); failed++; }
}
async function itAsync(name, fn) {
  total++;
  try { await fn(); console.log(`    \u2713 ${name}`); passed++; }
  catch (e) { console.log(`    \u2717 ${name}: ${e.message}`); failed++; }
}

const { API_BASE_URLS, apiGet } = require("../../cli/utils/api.js");

(async () => {
  describe("API_BASE_URLS", () => {
    it("has exactly 8 entries", () => {
      assert.strictEqual(Object.keys(API_BASE_URLS).length, 8);
    });

    it("contains all expected API names", () => {
      const expected = ["bug", "case", "eox", "psirt", "product", "software", "serial", "rma"];
      for (const name of expected) {
        assert.ok(API_BASE_URLS[name], `Missing API base URL for: ${name}`);
      }
    });

    it("all URLs start with https://", () => {
      for (const [name, url] of Object.entries(API_BASE_URLS)) {
        assert.ok(url.startsWith("https://"), `URL for ${name} should start with https://`);
      }
    });
  });

  console.log(`  apiGet`);
  await itAsync("throws for unknown API name", async () => {
    try {
      await apiGet("nonexistent", "/test", {}, { enabledApis: ["bug"] });
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.message.includes('Unknown API "nonexistent"'), `Expected unknown API error, got: ${e.message}`);
    }
  });

  await itAsync("throws for disabled API", async () => {
    try {
      await apiGet("bug", "/test", {}, { enabledApis: ["case", "eox"] });
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.message.includes('API "bug" is not enabled'), `Expected disabled API error, got: ${e.message}`);
    }
  });

  console.log(`\n  api.test.js: ${total} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
