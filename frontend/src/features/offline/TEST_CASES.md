# Test cases (documented, not executed in this build environment)

| ID | Test type | Input/action | Expected |
|---|---|---|---|
| C01 | Unit | Quoted CSV comma and double quotes | Preserved within a cell |
| C02 | Unit | Malformed CSV mismatched row | Error identifies row |
| C03 | Unit | Fill missing on one column | Changed count correct; base version unchanged |
| C04 | Unit | Trim existing text | Only target column changed |
| C05 | Unit | Restore V1 from V2 | Creates V3 with V1 snapshot; V1/V2 preserved |
| C06 | Integration | Import CSV then reload page | IndexedDB retains rows and history |
| C07 | Integration | Backend stopped after page loads | Local Preview/Apply remain operational |
| C08 | E2E | Import → 3D → Preview → Apply → Restore | User sees correct version and values |
| C09 | E2E | Frontend refresh during Backend outage | Only works if frontend assets remain available; **cold-start offline not implemented** |
| C10 | Security | Existing backend auth/ownership | **Not implemented**; do not claim passed |

Automate using Vitest/Playwright when dependencies are available. No test is marked PASS without execution.
