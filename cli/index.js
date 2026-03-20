const { Command } = require("commander");
const pkg = require("../package.json");

// Suppress Node.js TLS warning
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  if (typeof warning === "string" && warning.includes("NODE_TLS_REJECT_UNAUTHORIZED")) return;
  originalEmitWarning.call(process, warning, ...args);
};

try {
  const updateNotifier = require("update-notifier").default || require("update-notifier");
  updateNotifier({ pkg }).notify();
} catch {};

const program = new Command();

program
  .name("cisco-support")
  .description("CLI for querying Cisco Support APIs — bugs, cases, EoX, PSIRT, product, software, serial, and RMA")
  .version(pkg.version)
  .option("--format <type>", "output format: table, json, toon, csv", "table")
  .option("--no-audit", "disable audit logging for this command")
  .option("--debug", "enable debug logging");

require("./commands/config.js")(program);
require("./commands/bug.js")(program);
require("./commands/case.js")(program);
require("./commands/eox.js")(program);
require("./commands/psirt.js")(program);
require("./commands/product.js")(program);
require("./commands/software.js")(program);
require("./commands/serial.js")(program);
require("./commands/rma.js")(program);
require("./commands/doctor.js")(program);

program.parse();
