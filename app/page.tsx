import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import RelativeTime from "@/components/RelativeTime";
import Link from "next/link";
import { Activity, Users, TrendingUp } from "lucide-react";
import { getConfig } from "@/lib/config";
import fs from "fs";
import path from "path";

/* -------------------- Types -------------------- */

type ActivityItem = {
  slug: string;
  contributor: string;
  contributor_name: string | null;
  contributor_avatar_url: string | null;
  contributor_role: string | null;
  occured_at: string;
  title?: string | null;
  text?: string | null;
  link?: string | null;
  points: number | null;
};

type ActivityGroup = {
  activity_definition: string;
  activity_name: string;
  activity_description?: string | null;
  activities: ActivityItem[];
};

type RecentActivitiesJSON = {
  updatedAt: number;
  groups: ActivityGroup[];
};

/* -------------------- Page -------------------- */

export default async function Home() {
  const config = getConfig();

  // 📄 Read static JSON from disk (NO fetch)
  const filePath = path.join(
    process.cwd(),
    "public",
    "leaderboard",
    "recent-activities.json"
  );

  let activityGroups: ActivityGroup[] = [];

  if (fs.existsSync(filePath)) {
    const file = fs.readFileSync(filePath, "utf-8");
    const data: RecentActivitiesJSON = JSON.parse(file);
    activityGroups = data.groups ?? [];
  }

  // 📊 Stats
  const totalActivities = activityGroups.reduce(
    (sum, group) => sum + group.activities.length,
    0
  );

  const uniqueContributors = new Set(
    activityGroups.flatMap((group) =>
      group.activities.map((a) => a.contributor)
    )
  ).size;

  const totalActivityTypes = activityGroups.length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">{config.org.name}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {config.org.description}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Activities
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">Recent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Contributors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueContributors}</div>
            <p className="text-xs text-muted-foreground">Recent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Activity Types
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivityTypes}</div>
            <p className="text-xs text-muted-foreground">Different types</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Activities</h2>
          <Link
            href="/leaderboard"
            className="text-sm text-primary hover:underline"
          >
            View Leaderboard →
          </Link>
        </div>

        {activityGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No recent activities
            </CardContent>
          </Card>
        ) : (
          activityGroups.map((group) => (
            <Card key={group.activity_definition}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {group.activity_name}
                </CardTitle>
                {group.activity_description && (
                  <p className="text-sm text-muted-foreground">
                    {group.activity_description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {group.activities.map((activity) => (
                  <div
                    key={activity.slug}
                    className="flex items-start gap-4 border-b pb-4 last:border-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={activity.contributor_avatar_url || undefined}
                      />
                      <AvatarFallback>
                        {(activity.contributor_name ||
                          activity.contributor)
                          .substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${activity.contributor}`}
                          className="font-medium hover:text-primary"
                        >
                          {activity.contributor_name ||
                            activity.contributor}
                        </Link>

                        {activity.contributor_role && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {activity.contributor_role}
                          </span>
                        )}

                        <RelativeTime
                          date={new Date(activity.occured_at)}
                          className="text-sm text-muted-foreground"
                        />
                      </div>

                      {activity.title && (
                        <p className="text-sm mt-1 truncate">
                          {activity.link ? (
                            <a
                              href={activity.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary hover:underline"
                            >
                              {activity.title}
                            </a>
                          ) : (
                            activity.title
                          )}
                        </p>
                      )}

                      {activity.text && (
                        <div
                          className="text-sm text-muted-foreground prose prose-sm"
                          dangerouslySetInnerHTML={{
                            __html: activity.text,
                          }}
                        />
                      )}
                    </div>

                    {activity.points && activity.points > 0 && (
                      <div className="text-sm font-medium text-primary">
                        +{activity.points}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
