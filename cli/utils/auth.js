const fs = require("node:fs");
const path = require("node:path");
const {
  getConfigDir,
  hasSsPlaceholders,
  resolveSsPlaceholders,
} = require("./config.js");

const TOKEN_ENDPOINT = "https://id.cisco.com/oauth2/default/v1/token";

function getTokenCachePath() {
  return path.join(getConfigDir(), "token.json");
}

async function fetchToken(clientId, clientSecret) {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return { access_token: data.access_token, expires_in: data.expires_in };
}

function cacheToken(tokenData) {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const cached = {
    ...tokenData,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
  fs.writeFileSync(getTokenCachePath(), JSON.stringify(cached, null, 2), {
    mode: 0o600,
  });
  return cached;
}

function loadCachedToken() {
  const cachePath = getTokenCachePath();
  if (!fs.existsSync(cachePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

function isTokenValid(cached) {
  if (!cached || !cached.expiresAt || !cached.access_token) return false;
  const margin = 30 * 60 * 1000; // 30 minutes
  return Date.now() < cached.expiresAt - margin;
}

async function getToken(config) {
  const cached = loadCachedToken();
  if (isTokenValid(cached)) return cached.access_token;

  let { clientId, clientSecret } = config;
  if (hasSsPlaceholders({ clientId, clientSecret })) {
    const resolved = resolveSsPlaceholders({ clientId, clientSecret });
    clientId = resolved.clientId;
    clientSecret = resolved.clientSecret;
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      'No API credentials configured. Run "cisco-support config set" to configure.',
    );
  }

  const tokenData = await fetchToken(clientId, clientSecret);
  cacheToken(tokenData);
  return tokenData.access_token;
}

module.exports = {
  fetchToken,
  getTokenCachePath,
  cacheToken,
  loadCachedToken,
  isTokenValid,
  getToken,
};
