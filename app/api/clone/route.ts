import { NextRequest, NextResponse } from "next/server";
import { addMessage, createProject, createProjectFiles } from "@/app/lib/db";
import { generatePlan } from "@/app/lib/planningEngine";
import { getPlanIntro } from "@/app/lib/planPresentation";

function parseGitHubUrl(raw: string): { owner: string; repo: string } | null {
  const url = raw.trim();
  const patterns = [
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/i,
    /^([\w.-]+)\/([\w.-]+)$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json({ error: "GitHub URL required" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers: { Accept: "application/vnd.github+json" }, next: { revalidate: 0 } }
    );

    if (!repoRes.ok) {
      return NextResponse.json(
        { error: "Repository not found or is private" },
        { status: 404 }
      );
    }

    const repo = (await repoRes.json()) as {
      name: string;
      full_name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      default_branch: string;
    };

    const idea = [
      `Import and continue building the GitHub repository ${repo.html_url}.`,
      `Repository: ${repo.full_name}.`,
      repo.description ? `Description: ${repo.description}.` : "",
      repo.language ? `Primary language: ${repo.language}.` : "",
      `Default branch: ${repo.default_branch}.`,
      "Analyze the repo context and prepare a plan to extend or improve it.",
    ]
      .filter(Boolean)
      .join(" ");

    const plan = await generatePlan(idea);
    plan.name = repo.name;
    plan.description = repo.description ?? plan.description;

    const project = await createProject(plan);
    await createProjectFiles(project.id, plan);
    await addMessage(project.id, "user", `Clone repo: ${repo.html_url}`, "chat");
    await addMessage(project.id, "assistant", getPlanIntro(plan), "plan", { plan });

    return NextResponse.json({ projectId: project.id, name: repo.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Clone failed" },
      { status: 500 }
    );
  }
}
