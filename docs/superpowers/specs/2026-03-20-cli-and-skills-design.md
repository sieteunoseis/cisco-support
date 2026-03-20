# cisco-support CLI & Skills Design Spec

## Overview

CLI tool for querying Cisco Support APIs — bugs, cases, EoX, PSIRT security advisories, product info, software suggestions, serial coverage, and RMA tracking. CLI-only package (no library layer needed — APIs are standard REST/OAuth 2.0). Follows the same patterns as cisco-axl, cisco-dime, and cisco-ise.

## Authentication

Cisco Support APIs use OAuth 2.0 client credentials flow:
- Token endpoint: `https://id.cisco.com/oauth2/default/v1/token`
- Grant type: `client_credentials`
- Token validity: 12 hours
- Auto-refresh: 30 minutes before expiry

Credentials stored at `~/.cisco-support/config.json` (0600 permissions):

```json
{
  "clientId": "<ss:22001:client-id>",
  "clientSecret": "<ss:22001:client-secret>",
  "enabledApis": ["bug", "case", "eox", "psirt", "product", "software", "serial", "rma"]
}
```

### Auth Precedence

CLI flags > env vars > config file

```bash
# Env vars
CISCO_CLIENT_ID=abc123
CISCO_CLIENT_SECRET=xyz789

# Config
cisco-support config add --client-id abc123 --client-secret xyz789
cisco-support config add --client-id '<ss:22001:client-id>' --client-secret '<ss:22001:client-secret>'
```

## Command Structure

Domain-grouped, read-only operations only (no write protection needed).

### Bug Commands

```bash
# Get bug details (up to 5 bug IDs)
cisco-support bug get CSCvx12345
cisco-support bug get CSCvx12345,CSCvx67890

# Search bugs
cisco-support bug search --keyword "memory leak"
cisco-support bug search --keyword "crash" --product "Cisco Unified Communications Manager"
cisco-support bug search --pid CSR1000V --release 17.3
cisco-support bug search --severity 1,2
cisco-support bug search --status open --modified-after 2026-01-01

# Progressive search (auto-fallback across strategies)
cisco-support bug search --keyword "voice gateway onemedia" --progressive
```

### Case Commands

```bash
cisco-support case get 123456789
cisco-support case get 123456789,987654321    # up to 30 cases
cisco-support case search --contract 12345
cisco-support case search --user userID123
```

### EoX (End-of-Life) Commands

```bash
cisco-support eox --pid WS-C3850-24T
cisco-support eox --serial FJC12345678
cisco-support eox --serial FJC12345678,FJC98765432
cisco-support eox --software "15.0(2)SE"
cisco-support eox --date-range 2026-01-01 2026-06-30
```

### PSIRT (Security Advisory) Commands

```bash
cisco-support psirt latest --count 10
cisco-support psirt get cisco-sa-20260101-example
cisco-support psirt --cve CVE-2026-1234
cisco-support psirt --bug CSCvx12345
cisco-support psirt --severity critical
cisco-support psirt --severity high --year 2026
cisco-support psirt --published-after 2026-01-01 --published-before 2026-03-01
```

### Product Commands

```bash
cisco-support product --serial FJC12345678
cisco-support product --serial FJC12345678,FJC98765432
cisco-support product --pid WS-C3850-24T
cisco-support product mdf --id 1234
```

### Software Commands

```bash
cisco-support software suggest --pid WS-C3850-24T
cisco-support software suggest --pid WS-C3850-24T,ISR4321
cisco-support software releases --pid WS-C3850-24T
cisco-support software compare --pid WS-C3850-24T --from 16.9 --to 17.3
```

### Serial Commands

```bash
cisco-support serial coverage FJC12345678
cisco-support serial coverage FJC12345678,FJC98765432
cisco-support serial warranty FJC12345678
```

### RMA Commands

```bash
cisco-support rma get 12345678
cisco-support rma --user userID123
cisco-support rma --serial FJC12345678
```

### Config Commands

```bash
cisco-support config add --client-id abc123 --client-secret xyz789
cisco-support config show
cisco-support config remove
cisco-support config test                    # validates token retrieval
cisco-support config enable-api bug,psirt    # enable specific APIs
cisco-support config disable-api rma         # disable specific APIs
```

### Doctor Command

```bash
cisco-support doctor
```

Checks:
1. Config — client ID/secret present
2. OAuth token — can we get a token?
3. API access — test each enabled API with a simple call
4. Config file permissions (600)
5. Token cache status

### Version

```bash
cisco-support version
```

## Global Flags

```
--format table|json|toon|csv    (default: table)
--no-audit                      (disable audit logging)
--debug                         (enable debug logging)
```

No `--host`, `--cluster`, `--insecure`, or `--read-only` — single endpoint, read-only by nature, Cisco uses valid TLS.

## Output Formatting

Same 4 formatters as the other CLIs: table, json, toon, csv.

Bug search results show: bug ID, severity, status, headline, product, last modified.
PSIRT results show: advisory ID, severity, title, CVE(s), first published.
EoX results show: PID, description, end-of-sale date, end-of-support date.

## Token Caching

OAuth tokens are cached at `~/.cisco-support/token.json`:
- Stores access token + expiry timestamp
- Auto-refreshes 30 minutes before expiry
- Never logged in audit trail
- File permissions: 0600

## Audit Trail

`~/.cisco-support/audit.jsonl` — same pattern as other CLIs. Logs command, API called, timestamp, duration, status. Never logs credentials or tokens. 10MB rotation.

## File Structure

```
cisco-support/
├── bin/
│   └── cisco-support.js
├── cli/
│   ├── index.js
│   ├── commands/
│   │   ├── config.js
│   │   ├── bug.js
│   │   ├── case.js
│   │   ├── eox.js
│   │   ├── psirt.js
│   │   ├── product.js
│   │   ├── software.js
│   │   ├── serial.js
│   │   ├── rma.js
│   │   └── doctor.js
│   ├── formatters/
│   │   ├── table.js
│   │   ├── json.js
│   │   ├── toon.js
│   │   └── csv.js
│   └── utils/
│       ├── config.js          # config read/write, ss-cli resolution
│       ├── auth.js            # OAuth 2.0 token management, caching
│       ├── api.js             # HTTP client, base URL routing per API
│       ├── audit.js           # JSONL audit trail
│       └── output.js          # format dispatch, error hints
├── skills/
│   └── cisco-support-cli/
│       └── SKILL.md
├── package.json
└── README.md
```

## Dependencies

| Package | Purpose |
|---|---|
| `commander` | CLI framework |
| `cli-table3` | Table output |
| `@toon-format/toon` | TOON output |
| `csv-stringify` | CSV output |
| `axios` | HTTP client |
| `update-notifier` | Version check |

## API Base URLs

| API | Base URL |
|---|---|
| Bug | `https://apix.cisco.com/bug/v2.0` |
| Case | `https://apix.cisco.com/case/v3` |
| EoX | `https://apix.cisco.com/supporttools/eox/rest/5` |
| PSIRT | `https://apix.cisco.com/security/advisories/v2` |
| Product | `https://apix.cisco.com/product/v1` |
| Software | `https://apix.cisco.com/software/v4` |
| Serial | `https://apix.cisco.com/sn2info/v2` |
| RMA | `https://apix.cisco.com/return/v1.0` |

## Skills.sh Skill

Single `cisco-support-cli` skill documenting all commands, common workflows like:
- "Check if my hardware is end-of-life"
- "Find known bugs for my CUCM version"
- "Get security advisories for my product"
- "Check warranty status for serial numbers"
- "Compare bugs between software versions"
