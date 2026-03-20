const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

function flattenProductList(productList) {
  const results = [];
  for (const product of productList) {
    const suggestions = product.suggestions || [];
    for (const s of suggestions) {
      results.push({ ...s, productId: product.id || product.product });
    }
    if (suggestions.length === 0) {
      results.push(product);
    }
  }
  return results;
}

function pickColumns(releases) {
  return releases.map((r) => ({
    productId: r.productId || r.id || r.product,
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
        const rawList = data.productList || data.suggestions || [];
        const suggestions = flattenProductList(Array.isArray(rawList) ? rawList : [rawList]);
        if (globalOpts.audit !== false) logOperation({ command: "software suggest", pids });
        await printResult(pickColumns(suggestions), globalOpts.format);
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
        const rawList = data.productList || data.releases || [];
        const releases = flattenProductList(Array.isArray(rawList) ? rawList : [rawList]);
        if (globalOpts.audit !== false) logOperation({ command: "software releases", pid: opts.pid });
        await printResult(pickColumns(releases), globalOpts.format);
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

        const fromRaw = fromData.productList || fromData.suggestions || [];
        const toRaw = toData.productList || toData.suggestions || [];
        const fromSuggestions = flattenProductList(Array.isArray(fromRaw) ? fromRaw : [fromRaw]);
        const toSuggestions = flattenProductList(Array.isArray(toRaw) ? toRaw : [toRaw]);

        console.log(`\n  Suggestions from version: ${opts.from}`);
        await printResult(pickColumns(fromSuggestions), globalOpts.format);

        console.log(`\n  Suggestions from version: ${opts.to}`);
        await printResult(pickColumns(toSuggestions), globalOpts.format);

        if (globalOpts.audit !== false) logOperation({ command: "software compare", pid: opts.pid, from: opts.from, to: opts.to });
      } catch (err) { printError(err); }
    });
};
