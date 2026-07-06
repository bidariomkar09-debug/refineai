import { test, expect } from "@playwright/test";
import {
  partitionBuildQueue,
  shouldSkipFileBuild,
  isAutoWiredAppFile,
} from "../app/lib/buildSpeed";
import type { DbFile } from "../app/lib/agentTypes";

function mockFile(path: string, status: DbFile["status"] = "pending"): DbFile {
  return {
    id: path,
    project_id: "p",
    file_path: path,
    file_name: path.split("/").pop() ?? path,
    content: null,
    status,
    score: 0,
    rounds_taken: 0,
    sort_order: 0,
    created_at: "",
  };
}

test.describe("Build speed optimizations", () => {
  test("skips App.js when section components exist", () => {
    const files = [
      mockFile("src/App.js"),
      mockFile("src/components/Hero.js"),
      mockFile("src/components/Footer.js"),
    ];
    expect(isAutoWiredAppFile("src/App.js")).toBe(true);
    expect(shouldSkipFileBuild(files[0], files)).toBe(true);
    expect(shouldSkipFileBuild(files[1], files)).toBe(false);
  });

  test("partitionBuildQueue separates scaffold from components", () => {
    const files = [
      mockFile("package.json"),
      mockFile("src/App.js"),
      mockFile("src/components/Hero.js"),
      mockFile("src/components/About.js"),
    ];
    const { build, skip } = partitionBuildQueue(files);
    expect(skip.map((f) => f.file_path)).toEqual(
      expect.arrayContaining(["package.json", "src/App.js"])
    );
    expect(build).toHaveLength(2);
  });
});
