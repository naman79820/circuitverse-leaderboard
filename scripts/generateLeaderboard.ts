import fs from "fs";
import path from "path";

const ORG = "CircuitVerse";
const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  throw new Error("GITHUB_TOKEN is required");
}

/* ---------------- Scoring Rules ---------------- */

const POINTS = {
  PR_OPENED: 2,
  PR_MERGED: 5,
  REVIEW: 4, // to be added next
  ISSUE_OPENED: 1,
  LABEL_ADDED: 1,
  LABEL_REMOVED: 1,
};

/* ---------------- Bot Filtering ---------------- */

const BOT_USERS = [
  "dependabot[bot]",
  "github-actions[bot]",
];

function isBotUser(user: any): boolean {
  // GitHub official field
  if (user?.type && user.type !== "User") return true;

  // fallback (extra safety)
  const login = user?.login;
  if (!login) return true;

  return login.endsWith("[bot]");
}

/* ---------------- Types ---------------- */

export type UserEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  total_points: number;
  activity_breakdown: Record<
    string,
    { count: number; points: number }
  >;
  daily_activity: {
    date: string;
    count: number;
    points: number;
  }[];
};

export type ActivityItem = {
  slug: string;
  type: string;
  title: string | null;
  occured_at?: string;
  closed_at?: string;
  points: number;
  link?: string | null;
  contributor: string;
  contributor_name: string | null;
  contributor_avatar_url: string | null;
};

/* ---------------- Helpers ---------------- */

async function gh(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `GitHub API error ${res.status}: ${text}`
    );
  }

  return res.json();
}

function dateISO(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function ensureUser(
  map: Map<string, UserEntry>,
  user: any
) {
  if (!map.has(user.login)) {
    map.set(user.login, {
      username: user.login,
      name: user.name ?? null,
      avatar_url: user.avatar_url ?? null,
      role: "Contributor",
      total_points: 0,
      activity_breakdown: {},
      daily_activity: [],
    });
  }
  return map.get(user.login)!;
}

function addActivity(
  entry: UserEntry,
  type: string,
  date: string | undefined,
  points: number
) {
  if (!date) return;

  entry.total_points += points;

  entry.activity_breakdown[type] ??= {
    count: 0,
    points: 0,
  };
  entry.activity_breakdown[type].count += 1;
  entry.activity_breakdown[type].points += points;

  const day = date.split("T")[0] ?? date;

  entry.daily_activity.push({
    date: day,
    count: 1,
    points,
  });
}

/* ---------------- Core Generator ---------------- */

async function generate(
  period: "week" | "2week" | "3week" | "month" | "2month" | "year",
  days: number
) {
  const since = dateISO(days);
  const users = new Map<string, UserEntry>();
  const activities: ActivityItem[] = [];

  /* ---- PRs Opened ---- */
  const prs = await gh(
    `${GITHUB_API}/search/issues?q=org:${ORG}+is:pr+created:>=${since}&per_page=100`
  );

  for (const pr of prs.items ?? []) {
    if (isBotUser(pr.user)) continue;
    const user = ensureUser(users, pr.user);
    addActivity(
      user,
      "PR opened",
      pr.created_at,
      POINTS.PR_OPENED
    );
    activities.push({
      slug: `pr-opened-${pr.id}`,
      type: "PR opened",
      title: pr.title,
      occured_at: pr.created_at,
      points: POINTS.PR_OPENED,
      link: pr.html_url,
      contributor: pr.user.login,
      contributor_name: pr.user.login,
      contributor_avatar_url: pr.user.avatar_url,
    });
  }

  /* ---- PRs Merged ---- */
  const merged = await gh(
    `${GITHUB_API}/search/issues?q=org:${ORG}+is:pr+is:merged+merged:>=${since}&per_page=100`
  );

  for (const pr of merged.items ?? []) {
    if (isBotUser(pr.user)) continue;
    const user = ensureUser(users, pr.user);
    addActivity(
      user,
      "PR merged",
      pr.closed_at,
      POINTS.PR_MERGED
    );
    activities.push({
      slug: `pr-merged-${pr.id}`,
      type: "PR Merged",
      title: pr.title,
      closed_at: pr.closed_at,
      points: POINTS.PR_MERGED,
      link: pr.html_url,
      contributor: pr.user.login,
      contributor_name: pr.user.login,
      contributor_avatar_url: pr.user.avatar_url,
    });
  }

  /* ---- Issues Opened ---- */
  const issues = await gh(
    `${GITHUB_API}/search/issues?q=org:${ORG}+is:issue+created:>=${since}&per_page=100`
  );

  for (const issue of issues.items ?? []) {
    if (isBotUser(issue.user)) continue;
    const user = ensureUser(users, issue.user);
    addActivity(
      user,
      "Issue opened",
      issue.created_at,
      POINTS.ISSUE_OPENED
    );
    activities.push({
      slug: `issue-opened-${issue.id}`,
      type: "Issue opened",
      title: issue.title,
      occured_at: issue.created_at,
      points: POINTS.ISSUE_OPENED,
      link: issue.html_url,
      contributor: issue.user.login,
      contributor_name: issue.user.login,
      contributor_avatar_url: issue.user.avatar_url,
    });
  }

  /* ---- Output ---- */
  const entries = [...users.values()]
    .filter((u) => u.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points);

  const json = {
    period,
    updatedAt: Date.now(),
    startDate: new Date(dateISO(days))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    hiddenRoles: [],
    entries,
    activities,
    topByActivity: {},
  };

  const outPath = path.join(
    process.cwd(),
    "public",
    "leaderboard",
    `${period}.json`
  );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(json, null, 2));

  console.log(`✅ Generated ${period}.json`);
}

/* ---------------- Run ---------------- */

async function run() {
  await generate("week", 7);
  await generate("2week", 14);
  await generate("3week", 21);
  await generate("month", 30);
  await generate("2month", 60);
  await generate("year", 365);
}

run();
