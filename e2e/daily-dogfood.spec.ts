import { test, expect } from "@playwright/test";
import {
  computeBuildStreak,
  getTodaysBuildPrompt,
  DAILY_BUILD_PROMPTS,
} from "../app/lib/dailyBuildPrompts";
import { formatBuildProof, twitterIntentUrl } from "../app/lib/buildProof";

test.describe("Daily dogfood loop", () => {
  test("getTodaysBuildPrompt rotates deterministically by day", () => {
    const day1 = new Date("2026-07-06");
    const day2 = new Date("2026-07-07");
    const prompt1 = getTodaysBuildPrompt(day1);
    const prompt2 = getTodaysBuildPrompt(day2);
    expect(DAILY_BUILD_PROMPTS).toContain(prompt1);
    expect(prompt1).not.toBe(prompt2);
    expect(getTodaysBuildPrompt(day1)).toBe(prompt1);
  });

  test("computeBuildStreak counts consecutive complete days", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const streak = computeBuildStreak([
      { status: "complete", created_at: today.toISOString() },
      { status: "complete", created_at: yesterday.toISOString() },
      { status: "complete", created_at: twoDaysAgo.toISOString() },
      { status: "building", created_at: today.toISOString() },
    ]);
    expect(streak).toBe(3);
  });

  test("formatBuildProof includes prompt, time, and stats", () => {
    const { tweetText, clipboardText } = formatBuildProof({
      prompt: "Build a habit tracker",
      projectName: "Habit Tracker",
      elapsedMs: 120_000,
      fileCount: 6,
      avgScore: 96,
      previewVerified: true,
    });
    expect(tweetText).toContain("habit tracker");
    expect(tweetText).toContain("2m 0s");
    expect(tweetText).toContain("96% avg");
    expect(tweetText).toContain("preview verified");
    expect(clipboardText).toContain("Habit Tracker");
  });

  test("twitterIntentUrl encodes tweet text", () => {
    const url = twitterIntentUrl("Hello RefineAI");
    expect(url).toContain("twitter.com/intent/tweet");
    expect(url).toContain("Hello");
  });
});
