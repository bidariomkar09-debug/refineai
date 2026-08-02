import { test, expect } from "@playwright/test";
import { formatBuildProof, twitterIntentUrl } from "../app/lib/buildProof";

test.describe("Daily dogfood loop", () => {
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
