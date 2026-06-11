import { NextResponse } from "next/server";
import { fetchGitHubStats } from "@/lib/github-api";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const username = session.user.username;
  if (!username) {
    return NextResponse.json({ error: "No username" }, { status: 400 });
  }
  const stats = await fetchGitHubStats(username);
  return NextResponse.json(
    stats || {
      totalRepos: -1,
      totalCommits: -1,
      weeklyCommits: -1,
      dailyCommits: -1,
      stars: -1,
      followers: -1,
      following: -1,
      avatarUrl: "",
      languages: [],
    },
  );
}
