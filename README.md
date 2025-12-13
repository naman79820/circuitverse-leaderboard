# GitHub Activity Leaderboard

## 🏁 Overview

This project powers the **CircuitVerse Leaderboard**, which ranks contributors based on GitHub activity — such as opened PRs, merged PRs, issues created, and code reviews.
 the leaderboard uses **Upstash Redis** as a global caching database, allowing it to:

- Load instantly (<1 second)
- Refresh automatically in the background
- Display old data while fetching new updates
- Never exceed database storage limits


## 🧱 Tech Stack
- **Next.js 14+ / React 18** (App Router, RSC)
- **TypeScript**
- **Upstash Redis** for cache (or in‑memory fallback)
- **GitHub REST API v3**
- **Tailwind CSS**

---

## 📁 Project Structure (relevant parts)
```
app/
  leaderboard/
    [period]/
      page.tsx              # Server Component – renders leaderboard
      AutoRefresh.tsx       # Client Component (optional)
      AutoRefreshWrapper.tsx# Client wrapper for dynamic import
  api/
    leaderboard/
      [period]/route.ts     # API: builds & caches leaderboard
lib/
  config.ts                 # Org/config helpers (optional)
```

---

## 🧪 Scoring Model (default)
| Event          | Points |
|----------------|--------|
| PR opened      | 2      |
| PR merged      | 5      |
| Issue opened   | 1      |
| Review added   | 1      |

> Tweak in `route.ts`: `const scores = { prOpened: 2, prMerged: 5, issueOpened: 1, review: 1 }`.

---

## 🕒 Caching Model
- **Fresh window (TTL):** default `CACHE_TTL_SECONDS=3600` (1h)
- **Serve stale window:** default `STALE_TTL_SECONDS=86400` (24h)
- While stale **but not expired**, API serves cached data **and kicks a background rebuild**.
- If expired (older than stale window), the API builds **before** responding.

**Testing override (optional):** You can temporarily set `week` to 1‑minute TTL / 5‑minute stale for quick iteration. See *Testing Tips* below.

---
## ⚙️ Architecture Flow

### 🧠 System Overview

```text
+----------------+
|  User visits   |
|  /leaderboard  |
+--------+-------+
         |
         v
+-----------------------------+
| Check Redis (Upstash) cache |
+-----------------------------+
         |
   +-----+----------------------+
   |                            |
   | Cache exists               | Cache empty or expired
   v                            v
Serve old data instantly     Fetch new data from GitHub
(show old leaderboard)       Build leaderboard (PRs, Issues, Reviews)
   |                            |
   | Background job refreshes   |
   | and updates Redis cache    |
   +------------+---------------+
                |
                v
       User sees updated data next load
```

---

## 🕒 Refresh Timing (Smart Caching)

| Period | Fresh Window (TTL) | Serve-Stale Window (STALE_TTL) | Description |
|--------|--------------------|-------------------------------|-------------|
| Week   | 1 hour             | 24 hours                      | Refreshes hourly |
| Month  | 6 hours            | 24 hours                      | Refreshes every 6 hours |
| Year   | 12 hours           | 24 hours                      | Refreshes twice per day |

**Behavior Summary:**
- If cache is fresh → serve it instantly  
- If stale (but <24h old) → serve old data **and** start background refresh  
- If expired (>24h) → rebuild completely from GitHub  

---

## 📊 Data Flow

```text
GitHub API  --->  Leaderboard Builder  --->  Redis (Upstash)
                     |                            |
                     |                            |
                     |                            v
                     |                    Cached Data (JSON)
                     v
             Next.js API Route (/api/leaderboard)
                     |
                     v
               Frontend (page.tsx)
                     |
                     v
        Displays data instantly + shows:
        “Last updated: 12 Dec 2025, 06:42 PM IST”
        “Refreshing in background...”
```

---

## 💾 Redis Cache Structure

Each leaderboard period (`week`, `month`, `year`) is stored as one small Redis key:

```json
{
  "at": 1765577536254,
  "data": [
    {
      "username": "naman79820",
      "name": "Naman Chhabra",
      "total_points": 49,
      "breakdown": {
        "PR opened": { "count": 13, "points": 26 },
        "PR merged": { "count": 3, "points": 15 },
        "Issue opened": { "count": 7, "points": 7 }
      }
    }
  ]
}
```

- Redis only stores **3 keys total** → `lb:week`, `lb:month`, `lb:year`
- Each key auto-refreshes and overwrites itself  
- Optionally, Redis can auto-delete keys using:
  ```ts
  await redis.set(key, { at: nowAt, data: entries }, { ex: STALE_TTL });
  ```

---

## 💬 Why Not JSON File Storage?

| Problem | Explanation |
|----------|--------------|
| ❌ **Not shared globally** | Local files exist only on one server. On Vercel, multiple serverless instances can’t share them. |
| ❌ **No concurrency safety** | If multiple API calls write at the same time, JSON gets corrupted. |
| ❌ **Read-only in production** | Vercel’s file system is read-only, so JSON can’t be updated. |
| ❌ **No automatic cleanup** | JSON keeps growing; no TTL or expiry. |
| ❌ **Slow and fragile** | File I/O is slower than in-memory databases like Redis. |

---

## ✅ Why Redis (Upstash) is the Best Choice

| Advantage | Description |
|------------|--------------|
| ⚡ **Fast** | Reads and writes happen in milliseconds. |
| 🌍 **Global** | Shared cache across all regions and users. |
| 🔁 **Auto-refresh** | Data updates silently in the background. |
| 🧹 **Self-cleaning** | Old data is overwritten, not accumulated. |
| 🔐 **Safe** | Atomic writes, no corruption. |
| 💸 **Free tier** | 10K requests/day is more than enough. |

---

## ⚙️ Requirements
- **Node.js 18+**
- A **GitHub token** (classic or fine‑grained) with `public_repo` scope (read‑only access is sufficient for public orgs)
- (Recommended) **Upstash Redis** database

---
## 🚀 Upstash Redis Setup Guide

### 🔧 1. Create an Upstash Account  
- Go to [https://upstash.com](https://upstash.com)  
- Sign up using **GitHub** or **Google** (free tier works fine).  
- Once logged in, click **“Create Database”**.

---

### 🧱 2. Create Your Redis Database  
- Select **Redis** (not QStash / Kafka).  
- Choose a **Region** (close to your users).  
- Name it something like `circuitverse-leaderboard`.  
- Click **Create**.  

After provisioning, click the DB name — you’ll see:

```text
REST API URL: https://your-db-name.upstash.io
REST API Token: ATWYAAIxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 🔐 3. Copy Credentials  
You’ll use **two values** from Upstash in your `.env` file:

| Variable | Value from Dashboard |
|-----------|----------------------|
| `UPSTASH_REDIS_REST_URL` | REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | REST API Token |

---

## 🔐 Environment Variables
Create `.env.local` in project root:

```ini
# Which GitHub org to scan (default: CircuitVerse)
GITHUB_ORG=YourOrgName

# Personal Access Token (PAT). For public orgs, low-scope token is OK.
# Never commit this; store securely in Vercel/Secrets.
GITHUB_TOKEN=ghp_your_token_here

# Cache freshness and staleness (seconds)
CACHE_TTL_SECONDS=3600      # 1 hour fresh
STALE_TTL_SECONDS=86400     # 24 hours serve-stale

# Upstash Redis (optional locally, recommended in prod)
UPSTASH_REDIS_REST_URL=https://us1-awlong-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx:yyyyy
```

> **Security**: Do not commit real tokens. Use Vercel Environment Variables for production.

---

## 🚀 Quick Start (Local)
```bash
# 1) Install deps
pnpm i     # or npm i / yarn

# 2) Add .env.local (see above)

# 3) Run dev server
pnpm dev   # or npm run dev / yarn dev

# 4) Visit the UI
http://localhost:3000/leaderboard/week
```

If **Upstash** env vars are missing, the API automatically falls back to **in‑memory** cache.

---

## 🧰 API Reference
Base: `/api/leaderboard/[period]` where `[period]` ∈ `week | month | year`

### 1) Get leaderboard data
```
GET /api/leaderboard/week
```
**Response**
```json
{
  "period": "week",
  "updatedAt": 1734012345678,
  "entries": [
    {
      "username": "octocat",
      "name": "Mona",
      "avatar_url": "https://...",
      "total_points": 8,
      "breakdown": {
        "PR opened": { "count": 1, "points": 2 },
        "PR merged": { "count": 1, "points": 5 },
        "Review": { "count": 1, "points": 1 }
      }
    }
  ]
}
```

### 2) Lightweight status (no rebuild triggers)
```
GET /api/leaderboard/week?head=1
```
**Response**
```json
{
  "period": "week",
  "updatedAt": 1734012345678,
  "cache": "fresh | stale | miss",
  "nextRefreshAt": 1734015945678,
  "staleUntil": 1734102345678,
  "store": "upstash | memory"
}
```

### 3) Force a rebuild (testing only)
```
GET /api/leaderboard/week?force=1&debug=1
```
- Rebuilds immediately and returns new payload; also updates cache timestamps.

### 4) Probe GitHub rate limits
```
GET /api/leaderboard/week?probe=1
```

### 5) Ping/Health
```
GET /api/leaderboard/week?ping=1
```

### 6) (Optional) Test overrides for org and window
```
GET /api/leaderboard/week?org=YourOrg&sinceHours=6&force=1&debug=1
```
- `org` — temporarily scan a different org without redeploying
- `sinceHours` — limit window to recent hours (e.g. last 6h) for easy testing

> These overrides are safe for local/dev. Gate or remove for production if desired.

---

## 🧭 UI Usage
Navigate to:
- `/leaderboard/week`
- `/leaderboard/month`
- `/leaderboard/year`

Each entry card shows rank, avatar/name, total points, and a per‑activity breakdown.

**Footer** displays: _“Fresh ~1h, served‑stale up to 24h with background refresh.”_ (Based on your env settings.)

---


## 🧩 Implementation Details
- **Pagination**: Uses GitHub `Link` headers to follow pages up to small caps
- **Events scanned**:
  - Search API for PRs created
  - Search API for PRs merged
  - Search API for Issues created
  - Repository loop to fetch **PR reviews** (bounded by latest repos and recent PRs)
- **Enrichment**: Up to 25 top users are enriched with display name & avatar via `/users/:login`
- **Deterministic sorting**: by `total_points` desc

---


## 🤝 Contributing
1. Fork the repo
2. Create a feature branch: `git checkout -b feat/xyz`
3. Commit with conventional messages
4. Open a PR

Please keep changes small and add context in PR description. For questions, open a Discussion.


