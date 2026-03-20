const axios = require("axios");
const { getToken } = require("./auth.js");

const API_BASE_URLS = {
  bug: "https://apix.cisco.com/bug/v2.0",
  case: "https://apix.cisco.com/case/v3",
  eox: "https://apix.cisco.com/supporttools/eox/rest/5",
  psirt: "https://apix.cisco.com/security/advisories/v2",
  product: "https://apix.cisco.com/product/v1",
  software: "https://apix.cisco.com/software/v4",
  serial: "https://apix.cisco.com/sn2info/v2",
  rma: "https://apix.cisco.com/return/v1.0",
};

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

async function apiGet(apiName, path, params, config) {
  if (!API_BASE_URLS[apiName]) {
    throw new Error(`Unknown API "${apiName}". Valid: ${Object.keys(API_BASE_URLS).join(", ")}`);
  }

  if (config.enabledApis && !config.enabledApis.includes(apiName)) {
    throw new Error(`API "${apiName}" is not enabled. Update your config to enable it.`);
  }

  const token = await getToken(config);
  const url = `${API_BASE_URLS[apiName]}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params,
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;

      if (status === 429 && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
        continue;
      }

      if (status === 401) {
        throw new Error("Authentication failed. Your token may be expired or credentials invalid.");
      }
      if (status === 403) {
        throw new Error(`Access denied for API "${apiName}". Check your API grant permissions.`);
      }
      if (status === 404) {
        throw new Error(`Resource not found: ${apiName}${path}`);
      }
      if (status === 429) {
        throw new Error("Rate limit exceeded. Try again later.");
      }

      throw err;
    }
  }
}

module.exports = { apiGet, API_BASE_URLS };
