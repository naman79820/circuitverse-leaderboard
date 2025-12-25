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
import { Medal, Trophy, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ActivityTrendChart from "../../components/Leaderboard/ActivityTrendChart";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type LeaderboardEntry = {
  username: string;
  name: string | null;
  avatar_url: string | null;
  role?: string | null;

  total_points: number;

  activity_breakdown: Record<
    string,
    {
      count: number;
      points: number;
    }
  >;

  daily_activity?: Array<{
    date: string; // ISO string
    points: number;
    count: number;
  }>;
};

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  period: "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  topByActivity: Record<
    string,
    Array<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      points: number;
      count: number;
    }>
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

  // Search query state
  const [searchQuery, setSearchQuery] = useState("");

  // Get selected roles from query params
  // If no roles are selected, default to all visible roles (excluding hidden ones)
  const selectedRoles = useMemo(() => {
    const rolesParam = searchParams.get("roles");
    if (rolesParam) {
      return new Set(rolesParam.split(","));
    }
    // Default: exclude hidden roles
    const allRoles = new Set<string>();
    entries.forEach((entry) => {
      if (entry.role && !hiddenRoles.includes(entry.role)) {
        allRoles.add(entry.role);
      }
    });
    return allRoles;
  }, [searchParams, entries, hiddenRoles]);

  // Get unique roles from entries
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    entries.forEach((entry) => {
      if (entry.role) {
        roles.add(entry.role);
      }
    });
    return Array.from(roles).sort();
  }, [entries]);

  // Filter entries by selected roles and search query
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by roles
    if (selectedRoles.size > 0) {
      filtered = filtered.filter(
        (entry) => entry.role && selectedRoles.has(entry.role)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        const name = (entry.name || entry.username).toLowerCase();
        const username = entry.username.toLowerCase();
        return name.includes(query) || username.includes(query);
      });
    }

    return filtered;
  }, [entries, selectedRoles, searchQuery]);

  const toggleRole = (role: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(role)) {
      newSelected.delete(role);
    } else {
      newSelected.add(role);
    }
    updateRolesParam(newSelected);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("roles");
    router.push(`?${params.toString()}`, { scroll: false });
    setSearchQuery("");
  };

  const updateRolesParam = (roles: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (roles.size > 0) {
      params.set("roles", Array.from(roles).join(","));
    } else {
      params.delete("roles");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Filter top contributors by selected roles
  const filteredTopByActivity = useMemo(() => {
    if (selectedRoles.size === 0) {
      return topByActivity;
    }

    const filtered: typeof topByActivity = {};

    for (const [activityName, contributors] of Object.entries(topByActivity)) {
      const filteredContributors = contributors.filter((contributor) => {
        // Find the contributor in entries to get their role
        const entry = entries.find((e) => e.username === contributor.username);
        return entry?.role && selectedRoles.has(entry.role);
      });

      if (filteredContributors.length > 0) {
        filtered[activityName] = filteredContributors;
      }
    }

    return filtered;
  }, [topByActivity, selectedRoles, entries]);

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return (
        <Trophy className="h-6 w-6 text-[#FFD700]" aria-label="1st place" />
      );
    if (rank === 2)
      return (
        <Medal className="h-6 w-6 text-[#C0C0C0]" aria-label="2nd place" />
      );
    if (rank === 3)
      return (
        <Medal className="h-6 w-6 text-[#CD7F32]/70" aria-label="3rd place" />
      );
    return null;
  };

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-4xl text-[#50B78B] font-bold mb-2">
                  {periodLabels[period]} Leaderboard
                </h1>
                <p className="text-muted-foreground">
                  {filteredEntries.length} of {entries.length} contributors
                  {(selectedRoles.size > 0 || searchQuery) && " (filtered)"}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search contributors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="
                      pl-9 h-9 w-full sm:w-64 bg-white dark:bg-[#07170f] border border-[#50B78B]/60 dark:border-[#50B78B]/40 text-foreground dark:text-foreground shadow-sm dark:shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B] focus-visible:ring-offset-0 transition-colors
                    "
                  />
                </div>

                {/* Role Filter */}
                {availableRoles.length > 0 && (
                  <>
                    {(selectedRoles.size > 0 || searchQuery) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9 hover:bg-[#50B78B]/20 dark:hover:bg-[#50B78B]/20 focus:border-[#50B78B] focus-visible:ring-2 focus-visible:ring-[#50B78B]/40 outline-none"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 border border-[#50B78B]/30 dark:border-[#50B78B]/30 hover:bg-[#50B78B]/20 dark:hover:bg-[#50B78B]/20 focus:border-[#50B78B] focus-visible:ring-2 focus-visible:ring-[#50B78B]/40 outline-none"
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Role
                          {selectedRoles.size > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[#50B78B] text-white">
                              {selectedRoles.size}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-64 bg-white dark:bg-[#07170f]"
                        align="end"
                      >
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm">
                            Filter by Role
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {availableRoles.map((role) => (
                              <div
                                key={role}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={role}
                                  checked={selectedRoles.has(role)}
                                  onCheckedChange={() => toggleRole(role)}
                                />
                                <label
                                  htmlFor={role}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {role}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-8 border-b">
            {(["week", "month", "year"] as const).map((p) => (
              <Link
                key={p}
                href={`/leaderboard/${p}`}
                className={cn(
                  "px-4 py-2 font-medium transition-colors border-b-2 relative outline-none focus-visible:ring-2 focus-visible:ring-[#50B78B]/60 rounded-sm",
                  period === p
                    ? "border-[#50B78B] text-[#50B78B] bg-gradient-to-t from-[#50B78B]/12 to-transparent dark:from-[#50B78B]/12"
                    : "border-transparent text-muted-foreground hover:text-[#50B78B]"
                )}
              >
                {periodLabels[p]}
              </Link>
            ))}
          </div>

          {/* Leaderboard */}
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {entries.length === 0
                  ? "No contributors with points in this period"
                  : "No contributors match the selected filters"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;

                return (
                  <Card
                    key={entry.username}
                    className={cn(
                      "transition-all hover:shadow-md overflow-hidden",
                      isTopThree && "border-[#50B78B]/50"
                    )}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        {/* Top Section: Rank, Avatar, and Mobile Points */}
                        <div className="flex items-center gap-4 sm:gap-6">
                          {/* Rank */}
                          <div className="flex items-center justify-center size-10 sm:size-12 shrink-0">
                            {getRankIcon(rank) || (
                              <span className="text-xl sm:text-2xl font-bold text-[#50B78B]">
                                {rank}
                              </span>
                            )}
                          </div>

                          {/* Avatar */}
                          <Avatar className="size-12 sm:size-14 shrink-0 border-2 border-background shadow-sm">
                            <AvatarImage
                              src={entry.avatar_url || undefined}
                              alt={entry.name || entry.username}
                            />
                            <AvatarFallback className="bg-[#50B78B]/5 text-[#50B78B]">
                              {(entry.name || entry.username)
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Mobile-only Points Section */}
                          <div className="flex flex-col ml-auto sm:hidden items-end">
                            <div className="text-2xl font-bold text-[#50B78B] leading-none">
                              {entry.total_points}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">
                              pts
                            </div>
                          </div>
                        </div>

                        {/* Contributor Info & Identity */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base sm:text-lg font-bold truncate">
                              {entry.name || entry.username}
                            </h3>
                            {entry.role && (
                              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[#50B78B]/10 text-[#50B78B] font-medium border border-[#50B78B]/20">
                                {entry.role}
                              </span>
                            )}
                          </div>

                          <a
                            href={`https://github.com/${entry.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-muted-foreground hover:text-[#50B78B] transition-colors flex items-center gap-1"
                          >
                            @{entry.username}
                          </a>

                          <div className="mt-3" />

                          {/* Activity Breakdown - Improved Wrapping */}
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {Object.entries(entry.activity_breakdown)
                              .sort((a, b) => b[1].points - a[1].points)
                              .map(([activityName, data]) => (
                                <div
                                  key={activityName}
                                  className="text-[10px] sm:text-xs bg-muted/50 border border-border/50 px-2.5 py-1 rounded-full flex items-center gap-1.5"
                                >
                                  <span className="font-semibold text-foreground">
                                    {activityName}
                                  </span>
                                  <span className="h-3 w-[1px] bg-border" />
                                  <span className="text-[#50B78B] font-bold">
                                    +{data.points}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Desktop-only Stats & Trend Section */}
                        <div className="hidden sm:flex items-center gap-6 shrink-0 border-l pl-6 border-border/50">
                          {/* Activity Trend Chart */}
                          {entry.daily_activity &&
                            entry.daily_activity.length > 0 && (
                              <div className="opacity-80 hover:opacity-100 transition-opacity">
                                <ActivityTrendChart
                                  dailyActivity={entry.daily_activity}
                                  startDate={startDate}
                                  endDate={endDate}
                                  mode="points"
                                />
                              </div>
                            )}
                          
                          <div className="text-right min-w-[60px]">
                            <div className="text-3xl font-black text-[#50B78B] tracking-tight">
                              {entry.total_points}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                              points
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Top Contributors by Activity */}
        {Object.keys(filteredTopByActivity).length > 0 && (
          <div className="hidden xl:block w-80 shrink-0">
            <div>
              <h2 className="text-xl font-bold mb-6">Top Contributors</h2>
              <div className="space-y-4">
                {Object.entries(filteredTopByActivity).map(
                  ([activityName, contributors]) => (
                    <Card key={activityName} className="overflow-hidden p-0">
                      <CardContent className="p-0">
                        <div className="bg-[#50B78B]/8 dark:bg-[#50B78B]/12 px-4 py-2.5 border-b">
                          <h3 className="font-semibold text-sm text-foreground">
                            {activityName}
                          </h3>
                        </div>
                        <div className="p-3 space-y-2">
                          {contributors.map((contributor, index) => (
                            <Link
                              key={contributor.username}
                              href={`/${contributor.username}`}
                              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors group"
                            >
                              <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                {index === 0 && (
                                  <Trophy className="h-4 w-4 text-[#50B78B]" />
                                )}
                                {index === 1 && (
                                  <Medal className="h-4 w-4 text-zinc-400" />
                                )}
                                {index === 2 && (
                                  <Medal className="h-4 w-4 text-[#50B78B]/70" />
                                )}
                              </div>
                              <Avatar className="h-9 w-9 shrink-0 border">
                                <AvatarImage
                                  src={contributor.avatar_url || undefined}
                                  alt={contributor.name || contributor.username}
                                />
                                <AvatarFallback className="text-xs">
                                  {(contributor.name || contributor.username)
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-[#50B78B] transition-colors leading-tight">
                                  {contributor.name || contributor.username}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {contributor.count}{" "}
                                  {contributor.count === 1
                                    ? "activity"
                                    : "activities"}{" "}
                                  · {contributor.points} pts
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}  