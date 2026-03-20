const { loadConfig } = require("../utils/config.js");
const { apiGet } = require("../utils/api.js");
const { printResult, printError } = require("../utils/output.js");
const { logOperation } = require("../utils/audit.js");

const COLUMNS = ["bugId", "severity", "status", "headline", "lastModified"];

function filterBugs(bugs, opts) {
  let results = bugs;
  if (opts.severity) {
    const severities = opts.severity.split(",").map((s) => s.trim());
    results = results.filter((b) => severities.includes(String(b.severity)));
  }
  if (opts.status) {
    const status = opts.status.toLowerCase();
    results = results.filter((b) => (b.status || "").toLowerCase().includes(status));
  }
  if (opts.modifiedAfter) {
    const after = new Date(opts.modifiedAfter);
    results = results.filter((b) => new Date(b.lastModifiedDate || b.lastModified) >= after);
  }
  return results;
}

function pickColumns(bugs) {
  return bugs.map((b) => ({
    bugId: b.bugId || b.bug_id,
    severity: b.severity,
    status: b.status,
    headline: b.headline,
    lastModified: b.lastModifiedDate || b.lastModified,
  }));
}

module.exports = function (program) {
  const bug = program.command("bug").description("Query Cisco Bug API");

  bug
    .command("get <bugIds>")
    .description("Get bugs by ID (comma-separated, max 5)")
    .action(async (bugIds, opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const ids = bugIds.split(",").map((s) => s.trim()).join(",");
        if (ids.split(",").length > 5) throw new Error("Maximum 5 bug IDs per request.");
        const data = await apiGet("bug", `/bugs/bug_ids/${ids}`, {}, config);
        const bugs = data.bugs || [];
        if (globalOpts.audit !== false) logOperation({ command: "bug get", bugIds: ids });
        await printResult(pickColumns(bugs), globalOpts.format);
      } catch (err) { printError(err); }
    });

  bug
    .command("search")
    .description("Search bugs by keyword, product, or filters")
    .option("--keyword <text>", "search by keyword")
    .option("--pid <productId>", "search by product ID")
    .option("--release <version>", "software release (requires --pid)")
    .option("--severity <levels>", "filter by severity (comma-separated: 1,2,3,4,5,6)")
    .option("--status <status>", "filter by status: open, fixed, terminated")
    .option("--modified-after <date>", "filter by modified date (YYYY-MM-DD)")
    .option("--progressive", "try keyword first, then product, then severity")
    .option("--page <n>", "page number", "1")
    .option("--page-size <n>", "results per page", "25")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const config = loadConfig();
        const params = { pageIndex: opts.page, numOfResults: opts.pageSize };
        let data;

        if (opts.progressive) {
          // Try keyword first
          if (opts.keyword) {
            data = await apiGet("bug", `/bugs/keyword/${encodeURIComponent(opts.keyword)}`, params, config);
            if (data.bugs && data.bugs.length > 0) {
              const filtered = filterBugs(data.bugs, opts);
              if (globalOpts.audit !== false) logOperation({ command: "bug search", strategy: "keyword", keyword: opts.keyword });
              await printResult(pickColumns(filtered), globalOpts.format);
              return;
            }
          }
          // Try product
          if (opts.pid) {
            const path = opts.release
              ? `/bugs/products/product_id/${encodeURIComponent(opts.pid)}/software_releases/${encodeURIComponent(opts.release)}`
              : `/bugs/products/product_id/${encodeURIComponent(opts.pid)}`;
            data = await apiGet("bug", path, params, config);
            if (data.bugs && data.bugs.length > 0) {
              const filtered = filterBugs(data.bugs, opts);
              if (globalOpts.audit !== false) logOperation({ command: "bug search", strategy: "product", pid: opts.pid });
              await printResult(pickColumns(filtered), globalOpts.format);
              return;
            }
          }
          // Try severity
          if (opts.severity) {
            if (opts.pid) {
              const path = `/bugs/products/product_id/${encodeURIComponent(opts.pid)}`;
              data = await apiGet("bug", path, { ...params, severity: opts.severity }, config);
              const filtered = filterBugs(data.bugs || [], opts);
              if (globalOpts.audit !== false) logOperation({ command: "bug search", strategy: "severity" });
              await printResult(pickColumns(filtered), globalOpts.format);
              return;
            }
          }
          console.log("No results found with progressive search.");
          return;
        }

        // Non-progressive search
        if (opts.keyword) {
          data = await apiGet("bug", `/bugs/keyword/${encodeURIComponent(opts.keyword)}`, params, config);
        } else if (opts.pid && opts.release) {
          data = await apiGet("bug", `/bugs/products/product_id/${encodeURIComponent(opts.pid)}/software_releases/${encodeURIComponent(opts.release)}`, params, config);
        } else if (opts.pid) {
          data = await apiGet("bug", `/bugs/products/product_id/${encodeURIComponent(opts.pid)}`, params, config);
        } else {
          throw new Error("Provide --keyword or --pid to search bugs.");
        }

        const bugs = filterBugs(data.bugs || [], opts);
        if (globalOpts.audit !== false) logOperation({ command: "bug search", keyword: opts.keyword, pid: opts.pid });
        await printResult(pickColumns(bugs), globalOpts.format);
      } catch (err) { printError(err); }
    });
};
