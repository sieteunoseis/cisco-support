const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function pickColumns(returns) {
  return returns.map((r) => ({
    rmaNumber: r.rmaNumber || r.rma_number,
    status: r.status,
    serialNumber: r.serialNumber || r.serial_number,
    shipDate: r.shipDate || r.ship_date,
  }));
}

module.exports = function (program) {
  const rma = program.command("rma").description("Query Cisco RMA (Return Materials Authorization) API");

  rma
    .command("get <rmaNumber>")
    .description("Get RMA by number")
    .action(async (rmaNumber, opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const data = await apiGet("rma", `/returns/rma_numbers/${encodeURIComponent(rmaNumber)}`, {}, config);
        const returns = data.returns || (Array.isArray(data) ? data : [data]);
        if (globalOpts.audit !== false) logOperation({ command: "rma get", rmaNumber });
        await printResult(pickColumns(returns), globalOpts.format);
      } catch (err) { printError(err); }
    });

  rma
    .option("--user <userId>", "search by user ID")
    .option("--serial <serial>", "search by serial number")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        let data;

        if (opts.user) {
          data = await apiGet("rma", `/returns/users/user_ids/${encodeURIComponent(opts.user)}`, {}, config);
        } else if (opts.serial) {
          data = await apiGet("rma", `/returns/serial_numbers/${encodeURIComponent(opts.serial)}`, {}, config);
        } else {
          command.help();
          return;
        }

        const returns = data.returns || (Array.isArray(data) ? data : [data]);
        if (globalOpts.audit !== false) logOperation({ command: "rma", user: opts.user, serial: opts.serial });
        await printResult(pickColumns(returns), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
