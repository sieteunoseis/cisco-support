const fs = require("node:fs");
const path = require("node:path");
const { loadConfig, getConfigPath, getConfigDir, DEFAULT_APIS } = require("../utils/config.js");
const { getToken, loadCachedToken, isTokenValid, getTokenCachePath } = require("../utils/auth.js");
const { apiGet, API_BASE_URLS } = require("../utils/api.js");

module.exports = function (program) {
  program.command("doctor")
    .description("Check configuration and API connectivity health")
    .action(async (opts, command) => {
      const globalOpts = command.optsWithGlobals();
      let passed = 0;
      let warned = 0;
      let failed = 0;

      const ok = (msg) => { console.log(`  \u2713 ${msg}`); passed++; };
      const warn = (msg) => { console.log(`  \u26A0 ${msg}`); warned++; };
      const fail = (msg) => { console.log(`  \u2717 ${msg}`); failed++; };

      console.log("\n  cisco-support doctor");
      console.log("  " + "\u2500".repeat(50));

      // 1. Configuration
      console.log("\n  Configuration");
      let cfg;
      try {
        cfg = loadConfig();
        if (cfg.clientId) ok(`Client ID: ${cfg.clientId.slice(0, 8)}...`);
        else { fail("Client ID: not configured"); }

        if (cfg.clientSecret) ok("Client secret: configured");
        else { fail("Client secret: not configured"); }

        if (!cfg.clientId || !cfg.clientSecret) {
          console.log('    Run: cisco-support config add --client-id <id> --client-secret <secret>');
          printSummary(passed, warned, failed);
          return;
        }
      } catch (err) {
        fail(`Config error: ${err.message}`);
        printSummary(passed, warned, failed);
        return;
      }

      // 2. OAuth
      console.log("\n  OAuth");
      let tokenOk = false;
      try {
        const token = await getToken(cfg);
        ok(`OAuth token: obtained (${token.slice(0, 8)}...)`);
        tokenOk = true;
      } catch (err) {
        fail(`OAuth token: ${err.message}`);
      }

      // 3. API access
      if (tokenOk) {
        console.log("\n  API Access");
        const enabledApis = cfg.enabledApis || DEFAULT_APIS;
        const testPaths = {
          bug: "/bugs/bug_ids/CSCvb12345",
          case: "/cases/case_ids/600000000",
          eox: "/EOXByProductID/1/WS-C6509-E",
          psirt: "/latest/1",
          product: "/information/product_ids/WS-C6509-E",
          software: "/suggestions/releases/productIds/WS-C6509-E",
          serial: "/coverage/summary/serial_numbers/FXS1234Q0R7",
          rma: "/returns/rma_numbers/800000000",
        };

        for (const api of enabledApis) {
          try {
            await apiGet(api, testPaths[api] || "/test", {}, cfg);
            ok(`${api}: accessible`);
          } catch (err) {
            const msg = err.message || String(err);
            if (msg.includes("404") || msg.includes("not found")) {
              ok(`${api}: accessible (test resource not found, but API responded)`);
            } else if (msg.includes("403")) {
              warn(`${api}: access denied — check API grant permissions`);
            } else {
              fail(`${api}: ${msg}`);
            }
          }
        }

        const disabledApis = DEFAULT_APIS.filter((a) => !enabledApis.includes(a));
        for (const api of disabledApis) {
          warn(`${api}: disabled`);
        }
      }

      // 4. Config file permissions
      console.log("\n  Security");
      try {
        const configPath = getConfigPath();
        const stats = fs.statSync(configPath);
        const mode = (stats.mode & 0o777).toString(8);
        if (mode === "600") ok(`Config file permissions: ${mode} (secure)`);
        else warn(`Config file permissions: ${mode} — should be 600. Run: chmod 600 ${configPath}`);
      } catch {
        ok("Config file: not yet created (will use 600 on creation)");
      }

      // 5. Token cache status
      console.log("\n  Cache");
      try {
        const cached = loadCachedToken();
        if (cached) {
          if (isTokenValid(cached)) {
            const minutesLeft = Math.round((cached.expiresAt - Date.now()) / 60000);
            ok(`Token cache: valid (${minutesLeft} minutes remaining)`);
          } else {
            warn("Token cache: expired (will refresh on next request)");
          }
        } else {
          ok("Token cache: empty");
        }
      } catch { /* ignore */ }

      // 6. Audit trail size
      try {
        const auditPath = path.join(getConfigDir(), "audit.jsonl");
        if (fs.existsSync(auditPath)) {
          const stats = fs.statSync(auditPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
          ok(`Audit trail: ${sizeMB}MB`);
          if (stats.size > 8 * 1024 * 1024) warn("Audit trail approaching 10MB rotation limit");
        } else {
          ok("Audit trail: empty (no operations logged yet)");
        }
      } catch { /* ignore */ }

      printSummary(passed, warned, failed);
    });

  function printSummary(passed, warned, failed) {
    console.log("\n  " + "\u2500".repeat(50));
    console.log(`  Results: ${passed} passed, ${warned} warning${warned !== 1 ? "s" : ""}, ${failed} failed`);
    if (failed > 0) {
      process.exitCode = 1;
      console.log("  Status:  issues found — review failures above");
    } else if (warned > 0) {
      console.log("  Status:  healthy with warnings");
    } else {
      console.log("  Status:  all systems healthy");
    }
    console.log("");
  }
};
