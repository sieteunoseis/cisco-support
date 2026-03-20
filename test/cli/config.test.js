const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

let passed = 0, failed = 0, total = 0;
function describe(name, fn) { console.log(`  ${name}`); fn(); }
function it(name, fn) {
  total++;
  try { fn(); console.log(`    \u2713 ${name}`); passed++; }
  catch (e) { console.log(`    \u2717 ${name}: ${e.message}`); failed++; }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cisco-support-test-config-"));
process.env.CISCO_SUPPORT_CONFIG_DIR = tmpDir;

// Re-require after setting env so the module picks it up
const { loadConfig, saveConfig, hasSsPlaceholders, DEFAULT_APIS } = require("../../cli/utils/config.js");

describe("loadConfig", () => {
  it("returns defaults when no config file exists", () => {
    const config = loadConfig();
    assert.strictEqual(config.clientId, null);
    assert.strictEqual(config.clientSecret, null);
    assert.deepStrictEqual(config.enabledApis, DEFAULT_APIS);
  });
});

describe("saveConfig / loadConfig round-trip", () => {
  it("saveConfig writes and loadConfig reads back the same data", () => {
    const data = { clientId: "test-id", clientSecret: "test-secret", enabledApis: ["bug", "case"] };
    saveConfig(data);
    const loaded = loadConfig();
    assert.strictEqual(loaded.clientId, "test-id");
    assert.strictEqual(loaded.clientSecret, "test-secret");
    assert.deepStrictEqual(loaded.enabledApis, ["bug", "case"]);
  });

  it("config file exists on disk after save", () => {
    const configPath = path.join(tmpDir, "config.json");
    assert.ok(fs.existsSync(configPath), "config.json should exist");
  });
});

describe("hasSsPlaceholders", () => {
  it("detects <ss:ID:field> patterns", () => {
    assert.strictEqual(hasSsPlaceholders({ clientId: "<ss:123:username>" }), true);
  });

  it("detects patterns with dashes in field name", () => {
    assert.strictEqual(hasSsPlaceholders({ clientSecret: "<ss:456:client-secret>" }), true);
  });

  it("returns false for plain strings", () => {
    assert.strictEqual(hasSsPlaceholders({ clientId: "plain-value" }), false);
  });

  it("returns false for empty object", () => {
    assert.strictEqual(hasSsPlaceholders({}), false);
  });
});

describe("DEFAULT_APIS", () => {
  it("has exactly 8 APIs", () => {
    assert.strictEqual(DEFAULT_APIS.length, 8);
  });

  it("includes all expected API names", () => {
    const expected = ["bug", "case", "eox", "psirt", "product", "software", "serial", "rma"];
    for (const api of expected) {
      assert.ok(DEFAULT_APIS.includes(api), `Missing API: ${api}`);
    }
  });
});

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n  config.test.js: ${total} tests, ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
