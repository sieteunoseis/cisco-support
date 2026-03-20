const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function pickColumns(records) {
  return records.map((r) => ({
    pid: r.EOLProductID || r.pid,
    description: r.ProductIDDescription || r.description,
    endOfSaleDate: r.EndOfSaleDate?.value || r.endOfSaleDate,
    endOfSupportDate: r.EndOfSWMaintenanceReleasesDate?.value || r.endOfSupportDate,
    lastDateOfSupport: r.LastDateOfSupport?.value || r.lastDateOfSupport,
  }));
}

module.exports = function (program) {
  const eox = program.command("eox").description("Query Cisco End-of-Life (EoX) API");

  eox
    .option("--pid <pids>", "product IDs (comma-separated)")
    .option("--serial <serials>", "serial numbers (comma-separated)")
    .option("--software <release>", "software release string")
    .option("--date-range <start> <end>", "date range (start end)")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        let data;

        if (opts.pid) {
          const pids = opts.pid.split(",").map((s) => s.trim()).join(",");
          data = await apiGet("eox", `/EOXByProductID/1/${pids}`, {}, config);
        } else if (opts.serial) {
          const serials = opts.serial.split(",").map((s) => s.trim()).join(",");
          data = await apiGet("eox", `/EOXBySerialNumber/1/${serials}`, {}, config);
        } else if (opts.software) {
          data = await apiGet("eox", `/EOXBySWReleaseString/1/${encodeURIComponent(opts.software)}`, {}, config);
        } else if (opts.dateRange) {
          const parts = opts.dateRange.split(/\s+/);
          if (parts.length < 2) throw new Error("--date-range requires two dates: start end (YYYY-MM-DD)");
          data = await apiGet("eox", `/EOXByDates/1/${parts[0]}/${parts[1]}`, {}, config);
        } else {
          throw new Error("Provide --pid, --serial, --software, or --date-range.");
        }

        const records = data.EOXRecord || [];
        if (globalOpts.audit !== false) logOperation({ command: "eox", pid: opts.pid, serial: opts.serial });
        await printResult(pickColumns(records), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
