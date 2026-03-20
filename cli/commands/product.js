const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function pickColumns(products) {
  return products.map((p) => ({
    pid: p.orderable_pid || p.base_pid || p.id,
    productName: p.product_name || p.productName,
    productCategory: p.product_category || p.productCategory,
    productType: p.product_type || p.productType,
  }));
}

module.exports = function (program) {
  const product = program.command("product").description("Query Cisco Product Information API");

  product
    .option("--serial <serials>", "serial numbers (comma-separated)")
    .option("--pid <pids>", "product IDs (comma-separated)")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        let data;

        if (opts.serial) {
          const serials = opts.serial.split(",").map((s) => s.trim()).join(",");
          data = await apiGet("product", `/information/serial_numbers/${serials}`, {}, config);
        } else if (opts.pid) {
          const pids = opts.pid.split(",").map((s) => s.trim()).join(",");
          data = await apiGet("product", `/information/product_ids/${pids}`, {}, config);
        } else {
          // If no option and no subcommand matched, show help
          command.help();
          return;
        }

        const products = data.product_list || data.products || [];
        if (globalOpts.audit !== false) logOperation({ command: "product", serial: opts.serial, pid: opts.pid });
        await printResult(pickColumns(products), globalOpts.format);
      } catch (err) { printError(err); }
    });

  product
    .command("mdf")
    .description("Get product MDF (metadata framework) information")
    .requiredOption("--id <id>", "product ID for MDF lookup")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const data = await apiGet("product", `/information/product_ids_mdf/${encodeURIComponent(opts.id)}`, {}, config);
        const products = data.product_list || data.products || [];
        if (globalOpts.audit !== false) logOperation({ command: "product mdf", id: opts.id });
        await printResult(pickColumns(Array.isArray(products) ? products : [products]), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
