# cisco-support

[![npm](https://img.shields.io/npm/v/cisco-support)](https://www.npmjs.com/package/cisco-support)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Skills.sh](https://img.shields.io/badge/skills.sh-cisco--support--cli-blue)](https://skills.sh/sieteunoseis/cisco-support/cisco-support-cli)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-orange?logo=buy-me-a-coffee)](https://buymeacoffee.com/automatebldrs)

CLI for querying Cisco Support APIs — bugs, cases, end-of-life, security advisories, product info, software suggestions, serial coverage/warranty, and RMA tracking.

## Prerequisites

You need API credentials from [Cisco API Console](https://apidocs-prod.cisco.com/):

1. Sign in with your Cisco CCO account
2. Register an application
3. Enable the APIs you need (Bug, Case, EoX, PSIRT, Product, Software, Serial, RMA)
4. Note your Client ID and Client Secret

## Installation

```bash
npm install -g cisco-support
```

## Quick Start

```bash
# Configure credentials
cisco-support config add --client-id <your-id> --client-secret <your-secret>

# Or with Secret Server
cisco-support config add --client-id '<ss:22001:client-id>' --client-secret '<ss:22001:client-secret>'

# Verify
cisco-support doctor

# Start querying
cisco-support bug search --keyword "memory leak"
cisco-support psirt latest --count 5
cisco-support eox --pid WS-C3850-24T
```

## Commands

### Bug Search & Lookup

```bash
cisco-support bug get CSCvx12345
cisco-support bug get CSCvx12345,CSCvx67890
cisco-support bug search --keyword "crash"
cisco-support bug search --pid CSR1000V --release 17.3
cisco-support bug search --keyword "voice" --severity 1,2 --status open
cisco-support bug search --keyword "onemedia" --progressive
```

### Support Cases

```bash
cisco-support case get 123456789
cisco-support case search --contract 12345
cisco-support case search --user userID123
```

### End-of-Life (EoX)

```bash
cisco-support eox --pid WS-C3850-24T
cisco-support eox --serial FJC12345678
cisco-support eox --software "15.0(2)SE"
cisco-support eox --date-range 2026-01-01 2026-06-30
```

### Security Advisories (PSIRT)

```bash
cisco-support psirt latest --count 10
cisco-support psirt get cisco-sa-20260101-example
cisco-support psirt --cve CVE-2026-1234
cisco-support psirt --severity critical
cisco-support psirt --year 2026
```

### Product Information

```bash
cisco-support product --serial FJC12345678
cisco-support product --pid WS-C3850-24T
```

### Software Suggestions

```bash
cisco-support software suggest --pid WS-C3850-24T
cisco-support software releases --pid WS-C3850-24T
cisco-support software compare --pid WS-C3850-24T --from 16.9 --to 17.3
```

### Serial Coverage & Warranty

```bash
cisco-support serial coverage FJC12345678
cisco-support serial warranty FJC12345678
```

### RMA Tracking

```bash
cisco-support rma get 12345678
cisco-support rma --serial FJC12345678
```

### Configuration & Health

```bash
cisco-support config show
cisco-support config test
cisco-support config enable-api bug,psirt
cisco-support doctor
```

## Output Formats

All commands support `--format table|json|toon|csv`:

```bash
cisco-support bug search --keyword "crash" --format json
cisco-support eox --pid WS-C3850-24T --format csv > eox-report.csv
```

## Environment Variables

| Variable | Description |
|---|---|
| `CISCO_CLIENT_ID` | Cisco API client ID (overrides config) |
| `CISCO_CLIENT_SECRET` | Cisco API client secret (overrides config) |

## Related Tools

| Tool | Purpose |
|---|---|
| [cisco-axl](https://github.com/sieteunoseis/cisco-axl) | CUCM configuration via AXL |
| [cisco-dime](https://github.com/sieteunoseis/cisco-dime) | CUCM log collection via DIME |
| [cisco-ise](https://github.com/sieteunoseis/cisco-ise) | ISE endpoint & session management |
| [cisco-uc-engineer](https://github.com/sieteunoseis/cisco-uc-engineer) | UC troubleshooting orchestration |

## Funding

[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=automatebldrs&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/automatebldrs)

## License

MIT
