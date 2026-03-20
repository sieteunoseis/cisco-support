const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function pickColumns(advisories) {
  return advisories.map((a) => ({
    advisoryId: a.advisoryId,
    severity: a.sir,
    title: a.advisoryTitle,
    cves: Array.isArray(a.cves) ? a.cves.join(", ") : a.cves || "",
    firstPublished: a.firstPublished,
  }));
}

function extractAdvisories(data) {
  return data.advisories || (Array.isArray(data) ? data : [data]);
}

module.exports = function (program) {
  const psirt = program.command("psirt").description("Query Cisco PSIRT (security advisory) API");

  psirt
    .command("latest")
    .description("Get latest advisories")
    .option("--count <n>", "number of advisories to retrieve", "10")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const data = await apiGet("psirt", `/latest/${opts.count}`, {}, config);
        const advisories = extractAdvisories(data);
        if (globalOpts.audit !== false) logOperation({ command: "psirt latest", count: opts.count });
        await printResult(pickColumns(advisories), globalOpts.format);
      } catch (err) { printError(err); }
    });

  psirt
    .command("get <advisoryId>")
    .description("Get a specific advisory by ID")
    .action(async (advisoryId, opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const data = await apiGet("psirt", `/advisory/${encodeURIComponent(advisoryId)}`, {}, config);
        const advisories = extractAdvisories(data);
        if (globalOpts.audit !== false) logOperation({ command: "psirt get", advisoryId });
        await printResult(pickColumns(advisories), globalOpts.format);
      } catch (err) { printError(err); }
    });

  psirt
    .option("--cve <cve>", "search by CVE ID")
    .option("--bug <bugId>", "search by bug ID")
    .option("--severity <level>", "search by severity: critical, high, medium, low, informational")
    .option("--year <year>", "search by year")
    .option("--published-after <date>", "filter by first published start date (YYYY-MM-DD)")
    .option("--published-before <date>", "filter by first published end date (YYYY-MM-DD)")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        let data;

        if (opts.cve) {
          data = await apiGet("psirt", `/cve/${encodeURIComponent(opts.cve)}`, {}, config);
        } else if (opts.bug) {
          data = await apiGet("psirt", `/bugid/${encodeURIComponent(opts.bug)}`, {}, config);
        } else if (opts.severity) {
          data = await apiGet("psirt", `/severity/${encodeURIComponent(opts.severity)}`, {}, config);
        } else if (opts.year) {
          data = await apiGet("psirt", `/year/${encodeURIComponent(opts.year)}`, {}, config);
        } else if (opts.publishedAfter && opts.publishedBefore) {
          data = await apiGet("psirt", "/firstpublished", { startDate: opts.publishedAfter, endDate: opts.publishedBefore }, config);
        } else {
          // If no options provided and no subcommand, show help
          command.help();
          return;
        }

        const advisories = extractAdvisories(data);
        if (globalOpts.audit !== false) logOperation({ command: "psirt", cve: opts.cve, bug: opts.bug, severity: opts.severity, year: opts.year });
        await printResult(pickColumns(advisories), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
