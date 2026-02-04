/**
 * Plan Cataloger
 *
 * Ensures plan content is cataloged in .jacques/index.json with content-based dedup.
 * This is the single entry point for adding plans to the catalog regardless of source
 * (embedded, written, or agent-generated).
 */

import { promises as fs } from "fs";
import { join } from "path";
import type { PlanEntry } from "../context/types.js";
import { readProjectIndex, addPlanToIndex } from "../context/indexer.js";
import {
  generatePlanFingerprint,
  extractPlanTitle,
  findDuplicatePlan,
} from "./plan-extractor.js";

export interface CatalogPlanInput {
  title: string;
  content: string;
  sessionId: string;
}

/**
 * Generate a filename for a plan.
 * Format: YYYY-MM-DD_title-slug.md
 */
function generatePlanFilename(title: string): string {
  const date = new Date().toISOString().split("T")[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);

  return `${date}_${slug}.md`;
}

/**
 * Generate a versioned filename to avoid collisions.
 */
async function generateVersionedFilename(
  basePath: string,
  filename: string
): Promise<string> {
  const ext = ".md";
  const nameWithoutExt = filename.replace(ext, "");

  let version = 2;
  let versionedFilename = filename;
  let versionedPath = join(basePath, versionedFilename);

  while (true) {
    try {
      await fs.access(versionedPath);
      // File exists, try next version
      versionedFilename = `${nameWithoutExt}-v${version}${ext}`;
      versionedPath = join(basePath, versionedFilename);
      version++;
    } catch {
      // File doesn't exist, we can use this version
      return versionedFilename;
    }
  }
}

/**
 * Catalog a plan in the project index.
 *
 * Takes plan content and ensures it exists in .jacques/index.json:
 * 1. Normalize content → SHA-256 hash
 * 2. Check for existing entry with same contentHash
 * 3. If exists: merge sessionId into sessions[], return existing entry
 * 4. If new: write .md file, add to index, return new entry
 */
export async function catalogPlan(
  projectPath: string,
  input: CatalogPlanInput
): Promise<PlanEntry> {
  const { content, sessionId } = input;
  const fingerprint = generatePlanFingerprint(content);
  const now = new Date().toISOString();

  // Check for existing plan with same content hash in index
  const index = await readProjectIndex(projectPath);
  const existingByHash = index.plans.find(
    (p) => p.contentHash === fingerprint.contentHash
  );

  if (existingByHash) {
    // Content-hash match: merge session, update timestamp
    const updatedPlan: PlanEntry = {
      ...existingByHash,
      updatedAt: now,
      sessions: [...new Set([...existingByHash.sessions, sessionId])],
    };
    await addPlanToIndex(projectPath, updatedPlan);
    return updatedPlan;
  }

  // Also check fuzzy duplicate (same title + high similarity)
  const duplicate = await findDuplicatePlan(content, projectPath);
  if (duplicate) {
    // Fuzzy match: merge session, add hash, update timestamp
    const updatedPlan: PlanEntry = {
      ...duplicate,
      contentHash: fingerprint.contentHash,
      updatedAt: now,
      sessions: [...new Set([...duplicate.sessions, sessionId])],
    };
    await addPlanToIndex(projectPath, updatedPlan);
    return updatedPlan;
  }

  // New plan: write file and add to index
  const title = input.title || extractPlanTitle(content);
  let filename = generatePlanFilename(title);
  const plansDir = join(projectPath, ".jacques", "plans");
  await fs.mkdir(plansDir, { recursive: true });

  // Check for filename collision
  try {
    await fs.access(join(plansDir, filename));
    // File exists with different content, create versioned filename
    filename = await generateVersionedFilename(plansDir, filename);
  } catch {
    // File doesn't exist, use as-is
  }

  // Write the plan file
  const planPath = join(plansDir, filename);
  await fs.writeFile(planPath, content, "utf-8");

  // Create and save the catalog entry
  const planEntry: PlanEntry = {
    id: filename.replace(".md", ""),
    title,
    filename,
    path: `plans/${filename}`,
    contentHash: fingerprint.contentHash,
    createdAt: now,
    updatedAt: now,
    sessions: [sessionId],
  };

  await addPlanToIndex(projectPath, planEntry);
  return planEntry;
}
