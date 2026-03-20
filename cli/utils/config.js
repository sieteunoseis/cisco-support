const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync } = require("node:child_process");

const SS_PLACEHOLDER_RE = /<ss:(\d+):(\w+[\w-]*)>/g;

const DEFAULT_APIS = ["bug", "case", "eox", "psirt", "product", "software", "serial", "rma"];

function getConfigDir() {
  return process.env.CISCO_SUPPORT_CONFIG_DIR || path.join(os.homedir(), ".cisco-support");
}

function getConfigPath() {
  return path.join(getConfigDir(), "config.json");
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { clientId: null, clientSecret: null, enabledApis: DEFAULT_APIS };
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (!config.enabledApis) config.enabledApis = DEFAULT_APIS;
  return config;
}

function saveConfig(data) {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function hasSsPlaceholders(obj) {
  for (const value of Object.values(obj)) {
    if (typeof value === "string" && SS_PLACEHOLDER_RE.test(value)) {
      SS_PLACEHOLDER_RE.lastIndex = 0;
      return true;
    }
  }
  return false;
}

function resolveSsPlaceholders(obj) {
  const resolved = { ...obj };
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value !== "string") continue;
    SS_PLACEHOLDER_RE.lastIndex = 0;
    resolved[key] = value.replace(SS_PLACEHOLDER_RE, (match, id, field) => {
      try {
        const output = execSync(`ss-cli get ${id} --format json`, { encoding: "utf-8", timeout: 10000 });
        const secret = JSON.parse(output);
        if (secret[field] !== undefined) return secret[field];
        if (Array.isArray(secret.items)) {
          const item = secret.items.find((i) => i.fieldName === field || i.slug === field);
          if (item) return item.itemValue;
        }
        throw new Error(`Field "${field}" not found in secret ${id}`);
      } catch (err) {
        if (err.message.includes("ENOENT") || err.message.includes("not found")) {
          throw new Error(`Config contains Secret Server references (<ss:...>) but ss-cli is not available. Install with: npm install -g @sieteunoseis/ss-cli`);
        }
        throw err;
      }
    });
  }
  return resolved;
}

module.exports = {
  getConfigDir, getConfigPath, loadConfig, saveConfig,
  hasSsPlaceholders, resolveSsPlaceholders,
  DEFAULT_APIS, SS_PLACEHOLDER_RE,
};
