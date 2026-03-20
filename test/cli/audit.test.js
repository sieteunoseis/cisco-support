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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cisco-support-test-audit-"));
process.env.CISCO_SUPPORT_CONFIG_DIR = tmpDir;

const { logOperation } = require("../../cli/utils/audit.js");

describe("logOperation", () => {
  it("writes a line to audit.jsonl", () => {
    logOperation({ command: "bug search", args: { keyword: "test" } });
    const auditPath = path.join(tmpDir, "audit.jsonl");
    assert.ok(fs.existsSync(auditPath), "audit.jsonl should exist");
  });

  it("line contains a timestamp field", () => {
    const auditPath = path.join(tmpDir, "audit.jsonl");
    const content = fs.readFileSync(auditPath, "utf-8").trim();
    const line = JSON.parse(content.split("\n")[0]);
    assert.ok(line.timestamp, "Entry should have a timestamp");
    // Verify it looks like an ISO date
    assert.ok(line.timestamp.includes("T"), "Timestamp should be ISO format");
  });

  it("line contains the command field", () => {
    const auditPath = path.join(tmpDir, "audit.jsonl");
    const content = fs.readFileSync(auditPath, "utf-8").trim();
    const line = JSON.parse(content.split("\n")[0]);
    assert.strictEqual(line.command, "bug search");
  });

  it("appends multiple entries", () => {
    logOperation({ command: "case get", args: { id: "SR123" } });
    logOperation({ command: "eox by-pid", args: { pid: "WS-C3560" } });
    const auditPath = path.join(tmpDir, "audit.jsonl");
    const lines = fs.readFileSync(auditPath, "utf-8").trim().split("\n");
    assert.strictEqual(lines.length, 3, "Should have 3 entries total");
  });

  it("each line is valid JSONL (parseable JSON)", () => {
    const auditPath = path.join(tmpDir, "audit.jsonl");
    const lines = fs.readFileSync(auditPath, "utf-8").trim().split("\n");
    for (let i = 0; i < lines.length; i++) {
      let parsed;
      try {
        parsed = JSON.parse(lines[i]);
      } catch (e) {
        assert.fail(`Line ${i + 1} is not valid JSON: ${lines[i]}`);
      }
      assert.ok(parsed.timestamp, `Line ${i + 1} should have a timestamp`);
      assert.ok(parsed.command, `Line ${i + 1} should have a command`);
    }
  });
});

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n  audit.test.js: ${total} tests, ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
