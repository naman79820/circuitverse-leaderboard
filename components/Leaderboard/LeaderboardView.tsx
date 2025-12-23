"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { Medal, Trophy, Filter, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ActivityTrendChart from "./ActivityTrendChart";
import { Input } from "@/components/ui/input";

export type LeaderboardEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role?: string | null;
  total_points: number;
  activity_breakdown: Record<string, { count: number; points: number }>;
  daily_activity?: { date: string; points: number; count: number }[];
};

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  period: "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  topByActivity: Record<
    string,
    {
      username: string;
      name: string | null;
      avatar_url: string | null;
      points: number;
      count: number;
    }[]
  >;
  hiddenRoles: string[];
}

export default function LeaderboardView({
  entries,
  period,
  startDate,
  endDate,
  topByActivity,
  hiddenRoles,
}: LeaderboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  const selectedRoles = useMemo(() => {
    const param = searchParams.get("roles");
    if (param) return new Set(param.split(","));

    const roles = new Set<string>();
    entries.forEach((e) => {
      if (e.role && !hiddenRoles.includes(e.role)) roles.add(e.role);
    });
    return roles;
  }, [searchParams, entries, hiddenRoles]);

  const availableRoles = useMemo(
    () =>
      Array.from(new Set(entries.map((e) => e.role).filter(Boolean))) as string[],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    let list = entries;

    if (selectedRoles.size > 0) {
      list = list.filter((e) => e.role && selectedRoles.has(e.role));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          (e.name || e.username).toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q)
      );
    }

    return list;
  }, [entries, selectedRoles, searchQuery]);

  const toggleRole = (role: string) => {
    const next = new Set(selectedRoles);
    next.has(role) ? next.delete(role) : next.add(role);

    const params = new URLSearchParams(searchParams.toString());
    next.size
      ? params.set("roles", [...next].join(","))
      : params.delete("roles");

    router.push(`?${params}`, { scroll: false });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("roles");
    router.push(`?${params}`, { scroll: false });
    setSearchQuery("");
  };

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
  };

  const getRankIcon = (rank: number) =>
    rank === 1 ? (
      <Trophy className="h-6 w-6 text-yellow-400" />
    ) : rank === 2 ? (
      <Medal className="h-6 w-6 text-zinc-400" />
    ) : rank === 3 ? (
      <Medal className="h-6 w-6 text-orange-400" />
    ) : (
      <span className="text-2xl font-bold text-[#50B78B]">{rank}</span>
    );

  return (
    <div className="py-8">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0">
          {/* HEADER */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#50B78B]">
                {periodLabels[period]} Leaderboard
              </h1>
              <p className="text-muted-foreground">
                {filteredEntries.length} of {entries.length} contributors
              </p>
            </div>

            {/* SEARCH + FILTERS */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contributors..."
                  className="pl-9 h-9"
                />
              </div>

              {(selectedRoles.size > 0 || searchQuery) && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}

              {availableRoles.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Role
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    {availableRoles.map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedRoles.has(role)}
                          onCheckedChange={() => toggleRole(role)}
                        />
                        {role}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* LEADERBOARD LIST (EXTRA SIDE PADDING ADDED HERE) */}
          <div className="space-y-4 px-1 sm:px-2 lg:px-4">
            {filteredEntries.map((entry, index) => (
              <Card key={entry.username} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* RANK + AVATAR */}
                    <div className="flex items-center gap-4 shrink-0">
                      {getRankIcon(index + 1)}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={entry.avatar_url || undefined} />
                        <AvatarFallback>
                          {(entry.name || entry.username)
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {entry.name || entry.username}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        @{entry.username}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(entry.activity_breakdown).map(
                          ([k, v]) => (
                            <span
                              key={k}
                              className="text-xs bg-muted px-2 py-1 rounded-full"
                            >
                              {k}: {v.count}
                              {v.points > 0 && ` (+${v.points})`}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* POINTS + TREND */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-[#50B78B]">
                        {entry.total_points}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        points
                      </div>

                      <div className="hidden sm:block mt-2">
                        {entry.daily_activity && (
                          <ActivityTrendChart
                            dailyActivity={entry.daily_activity}
                            startDate={startDate}
                            endDate={endDate}
                            mode="points"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        {Object.keys(topByActivity).length > 0 && (
          <aside className="hidden xl:block w-80 shrink-0">
            <h2 className="text-xl font-bold mb-4">Top Contributors</h2>
            {Object.entries(topByActivity).map(([name, list]) => (
              <Card key={name} className="mb-4">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm">{name}</h3>
                  {list.map((c) => (
                    <div key={c.username} className="text-sm truncate">
                      {c.name || c.username} · {c.points} pts
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
