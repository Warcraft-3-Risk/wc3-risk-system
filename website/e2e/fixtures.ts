import type { Page } from "@playwright/test";

type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
};

type GameLobby = {
  name: string;
  server: string;
  map: string;
  host: string;
  slotsTaken: number;
  slotsTotal: number;
  checksum: number;
  created: number;
  lastUpdated: number;
  id: string;
};

export const sampleReleases: GitHubRelease[] = [
  {
    id: 40903,
    tag_name: "4.09-prerelease3",
    name: "Risk Europe 4.09 prerelease 3",
    body: "## Highlights\n\n- Minimap ownership colors now resolve shared slots.\n- Observer range tools are easier to follow.",
    published_at: "2026-05-23T12:00:00Z",
    html_url: "https://github.com/Warcraft-3-Risk/wc3-risk-system/releases/tag/4.09-prerelease3",
  },
];

export const sampleLobbies: GameLobby[] = [
  {
    id: "risk-europe-1",
    name: "Risk Europe 4.09 lobby",
    server: "eu",
    map: "Risk Europe unstable12",
    host: "Microhive",
    slotsTaken: 7,
    slotsTotal: 23,
    checksum: 123,
    created: 1_765_000_000,
    lastUpdated: 1_765_000_120,
  },
  {
    id: "risk-europe-2",
    name: "Risk Europe ranked",
    server: "use",
    map: "Risk Europe 4.09",
    host: "Commander",
    slotsTaken: 4,
    slotsTotal: 16,
    checksum: 456,
    created: 1_765_000_100,
    lastUpdated: 1_765_000_180,
  },
  {
    id: "filtered-non-risk",
    name: "Different map",
    server: "usw",
    map: "Footmen Frenzy",
    host: "OtherHost",
    slotsTaken: 12,
    slotsTotal: 12,
    checksum: 789,
    created: 1_765_000_200,
    lastUpdated: 1_765_000_240,
  },
];

export async function mockPatchNotes(page: Page, releases: GitHubRelease[] = sampleReleases) {
  await page.route(/https:\/\/api\.github\.com\/repos\/Warcraft-3-Risk\/wc3-risk-system\/releases\?per_page=20/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(releases),
    });
  });
}

export async function mockPatchNotesError(page: Page) {
  await page.route(/https:\/\/api\.github\.com\/repos\/Warcraft-3-Risk\/wc3-risk-system\/releases\?per_page=20/, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "temporarily unavailable" }),
    });
  });
}

export async function mockPatchNotesDelay(page: Page) {
  await page.route(/https:\/\/api\.github\.com\/repos\/Warcraft-3-Risk\/wc3-risk-system\/releases\?per_page=20/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

export async function mockLiveLobbies(page: Page, lobbies: GameLobby[] = []) {
  await page.route("https://api.wc3stats.com/gamelist", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        code: 200,
        queryTime: 1,
        body: lobbies,
      }),
    });
  });
}

export async function mockLiveLobbiesError(page: Page) {
  await page.route("https://api.wc3stats.com/gamelist", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ status: "ERROR", code: 500, body: [] }),
    });
  });
}
