# AI-Powered Automatic Block Planning — Frontend

**SIH Problem Statement 26027** | Ministry of Railways | Software | Transportation & Logistics

🔗 **Live demo:** https://block-scheduler-two.vercel.app

## What this is

A dashboard that shows railway maintenance block requests from three departments
(Engineering, Signal & Telecom, Traction) before and after AI-driven scheduling —
turning overlapping, manually-coordinated requests into a single conflict-free
corridor schedule.

## Tech stack

- React + Vite
- Tailwind CSS
- Fetches live schedules from the backend (`/schedule` endpoint)
- Falls back to a local simulation if the backend isn't running, so the demo never breaks

## Running it locally

```bash
npm install
npm run dev
```

Requires the backend (see [block-scheduler-backend](https://github.com/YOUR-USERNAME/block-scheduler-backend))
running on `localhost:8000` for live data — otherwise it shows simulated results.

## Team

| Name | Role |
|---|---|
| (Pranav aditya,Akshay,Mokshith) | Frontend + Backend |
|(kaushik,Vinitha) | ML |
| Amrutha| PPT / Pitch |

## Related repos

- Backend: https://github.com/alamuripranav77-wq/block-scheduler-backend
