const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function pickCoverageColumns(records) {
  return records.map((r) => ({
    serialNumber: r.sr_no || r.serialNumber,
    coverageStatus: r.is_covered || r.coverageStatus,
    contractNumber: r.contract_site_customer_name || r.contractNumber,
    serviceLineDescr: r.service_line_descr || r.serviceLineDescr,
  }));
}

function pickWarrantyColumns(records) {
  return records.map((r) => ({
    serialNumber: r.sr_no || r.serialNumber,
    warrantyType: r.warranty_type || r.warrantyType,
    warrantyEndDate: r.warranty_end_date || r.warrantyEndDate,
  }));
}

module.exports = function (program) {
  const serial = program.command("serial").description("Query Cisco Serial Number to Information API");

  serial
    .command("coverage <serials>")
    .description("Get coverage summary for serial numbers (comma-separated)")
    .action(async (serials, opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const serialList = serials.split(",").map((s) => s.trim()).join(",");
        const data = await apiGet("serial", `/coverage/summary/serial_numbers/${serialList}`, {}, config);
        const records = data.serial_numbers || [];
        if (globalOpts.audit !== false) logOperation({ command: "serial coverage", serials: serialList });
        await printResult(pickCoverageColumns(records), globalOpts.format);
      } catch (err) { printError(err); }
    });

  serial
    .command("warranty <serials>")
    .description("Get warranty status for serial numbers (comma-separated)")
    .action(async (serials, opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const serialList = serials.split(",").map((s) => s.trim()).join(",");
        const data = await apiGet("serial", `/coverage/status/serial_numbers/${serialList}`, {}, config);
        const records = data.serial_numbers || [];
        if (globalOpts.audit !== false) logOperation({ command: "serial warranty", serials: serialList });
        await printResult(pickWarrantyColumns(records), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
