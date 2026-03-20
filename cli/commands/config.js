const { loadConfig, saveConfig, getConfigPath, getConfigDir, DEFAULT_APIS } = require("../utils/config.js");
const { getToken } = require("../utils/auth.js");
const { printResult, printError } = require("../utils/output.js");

module.exports = function (program) {
  const config = program.command("config").description("Manage API credentials and enabled APIs");

  config
    .command("add")
    .description("Save API credentials")
    .requiredOption("--client-id <id>", "Cisco API client ID")
    .requiredOption("--client-secret <secret>", "Cisco API client secret")
    .action(async (opts) => {
      try {
        const existing = loadConfig();
        existing.clientId = opts.clientId;
        existing.clientSecret = opts.clientSecret;
        saveConfig(existing);
        console.log("API credentials saved successfully.");
      } catch (err) { printError(err); }
    });

  config
    .command("show")
    .description("Display current configuration (masks secret)")
    .action(async (opts, command) => {
      try {
        const globalOpts = command.optsWithGlobals();
        const cfg = loadConfig();
        const masked = {
          clientId: cfg.clientId || "(not set)",
          clientSecret: cfg.clientSecret ? cfg.clientSecret.slice(0, 4) + "****" : "(not set)",
          enabledApis: (cfg.enabledApis || DEFAULT_APIS).join(", "),
          configPath: getConfigPath(),
        };
        await printResult(masked, globalOpts.format);
      } catch (err) { printError(err); }
    });

  config
    .command("remove")
    .description("Delete the configuration file")
    .action(async () => {
      try {
        const fs = require("node:fs");
        const configPath = getConfigPath();
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
          console.log("Configuration file removed.");
        } else {
          console.log("No configuration file found.");
        }
      } catch (err) { printError(err); }
    });

  config
    .command("test")
    .description("Verify credentials by fetching an OAuth token")
    .action(async () => {
      try {
        const cfg = loadConfig();
        if (!cfg.clientId || !cfg.clientSecret) {
          throw new Error('No credentials configured. Run "cisco-support config add --client-id <id> --client-secret <secret>"');
        }
        const token = await getToken(cfg);
        console.log(`Authentication successful. Token obtained (${token.slice(0, 8)}...).`);
      } catch (err) { printError(err); }
    });

  config
    .command("enable-api <apis>")
    .description("Enable APIs (comma-separated: bug,case,eox,psirt,product,software,serial,rma)")
    .action(async (apis) => {
      try {
        const cfg = loadConfig();
        const toEnable = apis.split(",").map((a) => a.trim().toLowerCase());
        const invalid = toEnable.filter((a) => !DEFAULT_APIS.includes(a));
        if (invalid.length) throw new Error(`Unknown API(s): ${invalid.join(", ")}. Valid: ${DEFAULT_APIS.join(", ")}`);
        const current = new Set(cfg.enabledApis || DEFAULT_APIS);
        for (const api of toEnable) current.add(api);
        cfg.enabledApis = [...current];
        saveConfig(cfg);
        console.log(`Enabled APIs: ${cfg.enabledApis.join(", ")}`);
      } catch (err) { printError(err); }
    });

  config
    .command("disable-api <apis>")
    .description("Disable APIs (comma-separated: bug,case,eox,psirt,product,software,serial,rma)")
    .action(async (apis) => {
      try {
        const cfg = loadConfig();
        const toDisable = apis.split(",").map((a) => a.trim().toLowerCase());
        const invalid = toDisable.filter((a) => !DEFAULT_APIS.includes(a));
        if (invalid.length) throw new Error(`Unknown API(s): ${invalid.join(", ")}. Valid: ${DEFAULT_APIS.join(", ")}`);
        const current = new Set(cfg.enabledApis || DEFAULT_APIS);
        for (const api of toDisable) current.delete(api);
        cfg.enabledApis = [...current];
        saveConfig(cfg);
        console.log(`Enabled APIs: ${cfg.enabledApis.join(", ")}`);
      } catch (err) { printError(err); }
    });
};
