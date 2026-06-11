import { graphql } from "@octokit/graphql";

export interface GitHubStats {
  totalRepos: number;
  totalCommits: number;
  weeklyCommits: number;
  dailyCommits: number;
  stars: number;
  forks: number;
  followers: number;
  following: number;
  avatarUrl: string;
  languages: { name: string; color: string; size: number }[];
  partial?: boolean;
  contributionDays?: { date: string; count: number }[];
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

function githubRequestSignal(): AbortSignal {
  return AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS);
}

async function fetchPublicGitHubStats(
  username: string,
): Promise<GitHubStats | null> {
  try {
    const headers = { "User-Agent": "ProfileCanvas" };

    const userRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers, signal: githubRequestSignal() },
    );
    if (!userRes.ok) return null;
    const user = await userRes.json();

    // Fetch repos (up to 100, sorted by updated) to compute stars and languages
    let totalStars = 0;
    let totalForks = 0;
    const langMap: Record<
      string,
      { name: string; color: string; size: number }
    > = {};

    try {
      const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`,
        { headers, signal: githubRequestSignal() },
      );
      if (reposRes.ok) {
        const repos = (await reposRes.json()) as Array<{
          stargazers_count: number;
          forks_count: number;
          language: string | null;
        }>;
        for (const repo of repos) {
          totalStars += repo.stargazers_count || 0;
          totalForks += repo.forks_count || 0;
          if (repo.language) {
            const lang = repo.language;
            if (!langMap[lang]) {
              langMap[lang] = {
                name: lang,
                color: getLanguageColor(lang),
                size: 0,
              };
            }
            langMap[lang].size += 1;
          }
        }
      }
    } catch {
      // Repos fetch is best-effort; user data is sufficient
    }

    const sortedLanguages = Object.values(langMap)
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    return {
      totalRepos: user.public_repos || 0,
      totalCommits: -1,
      weeklyCommits: -1,
      dailyCommits: -1,
      stars: totalStars,
      forks: totalForks >= 0 ? totalForks : -1,
      followers: user.followers || 0,
      following: user.following || 0,
      avatarUrl: user.avatar_url || "",
      languages: sortedLanguages,
      partial: true,
    };
  } catch (error) {
    console.error("Error fetching public GitHub stats:", error);
    return null;
  }
}

/** Best-effort language color mapping for REST API fallback (no GraphQL language colors) */
function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    Go: "#00ADD8",
    Rust: "#dea584",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Ruby: "#701516",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    PHP: "#4F5D95",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
    Vue: "#41b883",
    Dart: "#00B4AB",
    Scala: "#c22d40",
    Lua: "#000080",
    Haskell: "#5e5086",
    Elixir: "#6e4a7e",
    Clojure: "#db5855",
    Erlang: "#B83998",
    R: "#198CE7",
    Zig: "#ec915c",
    OCaml: "#3be133",
    Dockerfile: "#384d54",
    MDX: "#fcb32c",
  };
  return colors[lang] || "#8b8b8b";
}

interface GraphQLResponse {
  user: {
    avatarUrl: string;
    followers: { totalCount: number };
    following: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: {
        name: string;
        stargazerCount: number;
        forkCount: number;
        defaultBranchRef: {
          target: {
            history: {
              totalCount: number;
            };
          } | null;
        } | null;
        languages: {
          edges: {
            size: number;
            node: {
              name: string;
              color: string;
            };
          }[];
        };
      }[];
    };
    contributionsCollection?: {
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: {
            contributionCount: number;
            date: string;
          }[];
        }[];
      };
    };
  } | null;
}

export async function fetchGitHubStats(
  username: string,
): Promise<GitHubStats | null> {
  if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN is not defined, falling back to public stats");
    return fetchPublicGitHubStats(username);
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        avatarUrl
        followers { totalCount }
        following { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes {
            name
            stargazerCount
            forkCount
            defaultBranchRef {
              target {
                ... on Commit {
                  history {
                    totalCount
                  }
                }
              }
            }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphql<GraphQLResponse>(query, {
      login: username,
      headers: {
        authorization: `token ${GITHUB_TOKEN}`,
      },
      request: {
        signal: githubRequestSignal(),
      },
    });

    const user = data.user;
    if (!user) return null;

    const langMap: Record<
      string,
      { name: string; color: string; size: number }
    > = {};
    let totalCommitsFromRepos = 0;
    let totalStars = 0;
    let totalForks = 0;

    user.repositories.nodes.forEach((repo) => {
      totalStars += repo.stargazerCount;
      totalForks += repo.forkCount;
      const historyCount = repo.defaultBranchRef?.target?.history?.totalCount;
      if (historyCount) {
        totalCommitsFromRepos += historyCount;
      }

      repo.languages.edges.forEach((edge) => {
        if (!langMap[edge.node.name]) {
          langMap[edge.node.name] = {
            name: edge.node.name,
            color: edge.node.color,
            size: 0,
          };
        }
        langMap[edge.node.name].size += edge.size;
      });
    });

    const sortedLanguages = Object.values(langMap)
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    const calendar = user.contributionsCollection?.contributionCalendar;
    const yearCommits = calendar?.totalContributions || 0;

    // We use the larger of the two as "totalCommits" to be as representative as possible
    const totalCommits = Math.max(totalCommitsFromRepos, yearCommits);

    const todayStr = new Date().toISOString().split("T")[0];
    const allDays = (calendar?.weeks || [])
      .flatMap((w) => w.contributionDays)
      .filter((day) => day.date <= todayStr);

    const weeklyCommits = allDays
      .slice(-7)
      .reduce((sum, day) => sum + day.contributionCount, 0);
    const dailyCommits =
      allDays.find((day) => day.date === todayStr)?.contributionCount || 0;

    return {
      totalRepos: user.repositories.totalCount,
      totalCommits,
      weeklyCommits,
      dailyCommits,
      stars: totalStars,
      forks: totalForks,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      avatarUrl: user.avatarUrl,
      languages: sortedLanguages,
      contributionDays: allDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
      })),
      partial: false,
    };
  } catch (error) {
    console.error("Error fetching GitHub stats via GraphQL:", error);
    return fetchPublicGitHubStats(username);
  }
}
