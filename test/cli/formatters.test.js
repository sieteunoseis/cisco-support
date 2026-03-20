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

const formatTable = require("../../cli/formatters/table.js");
const formatJson = require("../../cli/formatters/json.js");
const formatCsv = require("../../cli/formatters/csv.js");
const formatToon = require("../../cli/formatters/toon.js");

const sampleList = [
  { id: "1", name: "Bug A", severity: "high" },
  { id: "2", name: "Bug B", severity: "low" },
];
const sampleItem = { id: "1", name: "Bug A", severity: "high" };

(async () => {
  describe("table formatter", () => {
    it("produces string output for an array", () => {
      const result = formatTable(sampleList);
      assert.strictEqual(typeof result, "string");
      assert.ok(result.length > 0, "Output should not be empty");
    });

    it("includes column headers from object keys", () => {
      const result = formatTable(sampleList);
      assert.ok(result.includes("id"), "Should contain 'id' header");
      assert.ok(result.includes("name"), "Should contain 'name' header");
    });

    it("produces output for a single item", () => {
      const result = formatTable(sampleItem);
      assert.strictEqual(typeof result, "string");
      assert.ok(result.includes("Bug A"), "Should contain item value");
    });

    it("returns 'No results found' for empty array", () => {
      const result = formatTable([]);
      assert.strictEqual(result, "No results found");
    });
  });

  describe("json formatter", () => {
    it("produces valid JSON for an array", () => {
      const result = formatJson(sampleList);
      const parsed = JSON.parse(result);
      assert.ok(Array.isArray(parsed), "Parsed result should be an array");
      assert.strictEqual(parsed.length, 2);
    });

    it("produces valid JSON for a single item", () => {
      const result = formatJson(sampleItem);
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.id, "1");
    });

    it("output is pretty-printed with 2-space indent", () => {
      const result = formatJson(sampleItem);
      assert.ok(result.includes("  "), "Should contain 2-space indentation");
    });
  });

  describe("csv formatter", () => {
    it("produces CSV with headers for an array", () => {
      const result = formatCsv(sampleList);
      const lines = result.trim().split("\n");
      assert.ok(lines.length >= 3, "Should have header + 2 data rows");
      assert.ok(lines[0].includes("id"), "First line should contain header 'id'");
      assert.ok(lines[0].includes("name"), "First line should contain header 'name'");
    });

    it("produces CSV for a single item", () => {
      const result = formatCsv(sampleItem);
      const lines = result.trim().split("\n");
      assert.ok(lines.length >= 2, "Should have header + 1 data row");
    });

    it("returns empty string for empty array", () => {
      const result = formatCsv([]);
      assert.strictEqual(result, "");
    });
  });

  console.log(`  toon formatter`);
  await itAsync("produces string output", async () => {
    const result = await formatToon(sampleItem);
    assert.strictEqual(typeof result, "string");
    assert.ok(result.length > 0, "Output should not be empty");
  });

  await itAsync("handles array input", async () => {
    const result = await formatToon(sampleList);
    assert.strictEqual(typeof result, "string");
    assert.ok(result.length > 0, "Output should not be empty");
  });

  console.log(`\n  formatters.test.js: ${total} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
