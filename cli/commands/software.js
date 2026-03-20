const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function pickColumns(releases) {
  return releases.map((r) => ({
    version: r.imageName || r.releaseFormat1 || r.releaseDisplayName || r.version,
    releaseDate: r.releaseDate,
    majorRelease: r.majorRelease || r.releaseTrain,
    releaseLifecycleStatus: r.releaseLifecycleStatus || r.releaseLifeCycleStatus,
  }));
}

module.exports = function (program) {
  const software = program.command("software").description("Query Cisco Software Suggestion API");

  software
    .command("suggest")
    .description("Get software suggestions for product IDs")
    .requiredOption("--pid <pids>", "product IDs (comma-separated)")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const pids = opts.pid.split(",").map((s) => s.trim()).join(",");
        const data = await apiGet("software", `/suggestions/software/productIds/${pids}`, {}, config);
        const suggestions = data.productList || data.suggestions || [];
        if (globalOpts.audit !== false) logOperation({ command: "software suggest", pids });
        await printResult(pickColumns(Array.isArray(suggestions) ? suggestions : [suggestions]), globalOpts.format);
      } catch (err) { printError(err); }
    });

  software
    .command("releases")
    .description("Get software releases for a product ID")
    .requiredOption("--pid <pid>", "product ID")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const data = await apiGet("software", `/suggestions/releases/productIds/${encodeURIComponent(opts.pid)}`, {}, config);
        const releases = data.productList || data.releases || [];
        if (globalOpts.audit !== false) logOperation({ command: "software releases", pid: opts.pid });
        await printResult(pickColumns(Array.isArray(releases) ? releases : [releases]), globalOpts.format);
      } catch (err) { printError(err); }
    });

  software
    .command("compare")
    .description("Compare software suggestions between two versions")
    .requiredOption("--pid <pid>", "product ID")
    .requiredOption("--from <version>", "source version")
    .requiredOption("--to <version>", "target version")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const [fromData, toData] = await Promise.all([
          apiGet("software", `/suggestions/software/productIds/${encodeURIComponent(opts.pid)}`, { currentImage: opts.from }, config),
          apiGet("software", `/suggestions/software/productIds/${encodeURIComponent(opts.pid)}`, { currentImage: opts.to }, config),
        ]);

        const fromSuggestions = fromData.productList || fromData.suggestions || [];
        const toSuggestions = toData.productList || toData.suggestions || [];

        console.log(`\n  Suggestions from version: ${opts.from}`);
        await printResult(pickColumns(Array.isArray(fromSuggestions) ? fromSuggestions : [fromSuggestions]), globalOpts.format);

        console.log(`\n  Suggestions from version: ${opts.to}`);
        await printResult(pickColumns(Array.isArray(toSuggestions) ? toSuggestions : [toSuggestions]), globalOpts.format);

        if (globalOpts.audit !== false) logOperation({ command: "software compare", pid: opts.pid, from: opts.from, to: opts.to });
      } catch (err) { printError(err); }
    });
};
