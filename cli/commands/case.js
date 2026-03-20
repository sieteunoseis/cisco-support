const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

const COLUMNS = ["caseId", "severity", "status", "title", "createdDate"];

function pickColumns(cases) {
  return cases.map((c) => ({
    caseId: c.caseId || c.case_id,
    severity: c.severity,
    status: c.status,
    title: c.title,
    createdDate: c.createdDate || c.created_date,
  }));
}

module.exports = function (program) {
  const caseCmd = program.command("case").description("Query Cisco Case API");

  caseCmd
    .command("get <caseIds>")
    .description("Get cases by ID (comma-separated, max 30)")
    .action(async (caseIds, opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const ids = caseIds.split(",").map((s) => s.trim()).join(",");
        if (ids.split(",").length > 30) throw new Error("Maximum 30 case IDs per request.");
        const data = await apiGet("case", `/cases/case_ids/${ids}`, {}, config);
        const cases = data.cases || [];
        if (globalOpts.audit !== false) logOperation({ command: "case get", caseIds: ids });
        await printResult(pickColumns(cases), globalOpts.format);
      } catch (err) { printError(err); }
    });

  caseCmd
    .command("search")
    .description("Search cases by contract or user")
    .option("--contract <id>", "search by contract ID")
    .option("--user <id>", "search by user ID")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        let data;

        if (opts.contract) {
          data = await apiGet("case", `/cases/contracts/contract_ids/${encodeURIComponent(opts.contract)}`, {}, config);
        } else if (opts.user) {
          data = await apiGet("case", `/cases/users/user_ids/${encodeURIComponent(opts.user)}`, {}, config);
        } else {
          throw new Error("Provide --contract or --user to search cases.");
        }

        const cases = data.cases || [];
        if (globalOpts.audit !== false) logOperation({ command: "case search", contract: opts.contract, user: opts.user });
        await printResult(pickColumns(cases), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
