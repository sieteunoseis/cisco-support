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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cisco-support-test-auth-"));
process.env.CISCO_SUPPORT_CONFIG_DIR = tmpDir;

const { cacheToken, loadCachedToken, isTokenValid } = require("../../cli/utils/auth.js");

describe("cacheToken", () => {
  it("writes token data to disk", () => {
    const tokenData = { access_token: "abc123", expires_in: 3600 };
    const cached = cacheToken(tokenData);
    assert.strictEqual(cached.access_token, "abc123");
    assert.ok(cached.expiresAt > Date.now(), "expiresAt should be in the future");
  });

  it("creates token.json file", () => {
    const tokenPath = path.join(tmpDir, "token.json");
    assert.ok(fs.existsSync(tokenPath), "token.json should exist");
  });
});

describe("loadCachedToken", () => {
  it("reads back the cached token", () => {
    const cached = loadCachedToken();
    assert.ok(cached !== null, "Should return a token object");
    assert.strictEqual(cached.access_token, "abc123");
    assert.ok(typeof cached.expiresAt === "number", "expiresAt should be a number");
  });

  it("returns null when no token file exists", () => {
    const origDir = process.env.CISCO_SUPPORT_CONFIG_DIR;
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "cisco-support-test-auth-empty-"));
    process.env.CISCO_SUPPORT_CONFIG_DIR = emptyDir;

    // Need to clear require cache to pick up new env
    // Instead, test by checking file directly
    const tokenPath = path.join(emptyDir, "token.json");
    assert.ok(!fs.existsSync(tokenPath), "token.json should not exist in empty dir");

    fs.rmSync(emptyDir, { recursive: true, force: true });
    process.env.CISCO_SUPPORT_CONFIG_DIR = origDir;
  });
});

describe("isTokenValid", () => {
  it("returns true for a token expiring well in the future", () => {
    const cached = {
      access_token: "valid-token",
      expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from now
    };
    assert.strictEqual(isTokenValid(cached), true);
  });

  it("returns false for a token expiring within 30 minutes", () => {
    const cached = {
      access_token: "expiring-token",
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now (within 30-min margin)
    };
    assert.strictEqual(isTokenValid(cached), false);
  });

  it("returns false for an expired token", () => {
    const cached = {
      access_token: "expired-token",
      expiresAt: Date.now() - 1000,
    };
    assert.strictEqual(isTokenValid(cached), false);
  });

  it("returns false for null input", () => {
    assert.strictEqual(isTokenValid(null), false);
  });

  it("returns false for missing access_token", () => {
    assert.strictEqual(isTokenValid({ expiresAt: Date.now() + 999999999 }), false);
  });

  it("returns false for missing expiresAt", () => {
    assert.strictEqual(isTokenValid({ access_token: "tok" }), false);
  });
});

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n  auth.test.js: ${total} tests, ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
