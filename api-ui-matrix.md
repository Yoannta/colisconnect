# API to UI Matrix

- Root: `C:\Users\hp\.gemini\antigravity\scratch\colis_connect`
- Backend routes: `0`
- UI triggers: `3`

## Backend Coverage

| Method | Endpoint | Backend File:Line | UI Triggers | Status |
|---|---|---|---|---|

## Unmapped Frontend Calls

| Method | Path | Frontend File:Line | Evidence |
|---|---|---|---|
| GET | / | backend\anti_slop_test.js:8 | const res = await fetch(`http://localhost:8080${path}`, { |
| GET | /v1/flights | backend\server.js:83 | const response = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, { |
| GET | /v1/flights | test save\backend\server.js:82 | const response = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, { |
