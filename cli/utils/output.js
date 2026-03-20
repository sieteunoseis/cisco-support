const formatTable = require("../formatters/table.js");
const formatJson = require("../formatters/json.js");
const formatToon = require("../formatters/toon.js");
const formatCsv = require("../formatters/csv.js");

const formatters = { table: formatTable, json: formatJson, toon: formatToon, csv: formatCsv };

async function printResult(data, format) {
  const formatter = formatters[format || "table"];
  if (!formatter) { throw new Error(`Unknown format "${format}". Valid: table, json, toon, csv`); }
  const output = await Promise.resolve(formatter(data));
  console.log(output);
}

function printError(err) {
  const message = err.message || String(err);
  process.stderr.write(`Error: ${message}\n`);
  if (message.includes("Authentication failed") || message.includes("credentials")) {
    process.stderr.write('Hint: Run "cisco-support config test" to verify your credentials.\n');
  } else if (message.includes("not enabled")) {
    process.stderr.write('Hint: Run "cisco-support config show" to see enabled APIs.\n');
  }
  process.exitCode = 1;
}

module.exports = { printResult, printError };
