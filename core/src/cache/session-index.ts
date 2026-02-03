/**
 * Session Index
 *
 * Lightweight index for fast session listing and search.
 * Reads directly from Claude Code JSONL files - no content copying.
 *
 * Architecture:
 *   ~/.claude/projects/...           (SOURCE OF TRUTH)
 *          ↓ read directly
 *   GUI Viewer
 *          ↑
 *   ~/.jacques/cache/
 *     └── sessions-index.json        (~5KB, metadata only)
 */

import { promises as fs } from "fs";
import * as path from "path";
import { homedir } from "os";
import { parseJSONL, getEntryStatistics, type ParsedEntry } from "../session/parser.js";
import { listSubagentFiles, decodeProjectPath, type SubagentFile } from "../session/detector.js";
import { PLAN_TRIGGER_PATTERNS, extractPlanTitle } from "../archive/plan-extractor.js";

/** Claude projects directory */
const CLAUDE_PROJECTS_PATH = path.join(homedir(), ".claude", "projects");

/** Jacques cache directory */
const JACQUES_CACHE_PATH = path.join(homedir(), ".jacques", "cache");

/** Session index filename */
const SESSION_INDEX_FILE = "sessions-index.json";

/**
 * Entry in the session index
 * Contains only metadata - content is read directly from JSONL
 */
export interface SessionEntry {
  /** Session UUID */
  id: string;
  /** Full path to JSONL file */
  jsonlPath: string;
  /** Decoded project path (e.g., "/Users/gole/Desktop/my-project") */
  projectPath: string;
  /** Project name (basename of project path) */
  projectSlug: string;
  /** Session title (from summary or first user message) */
  title: string;
  /** First timestamp in session */
  startedAt: string;
  /** Last timestamp in session */
  endedAt: string;
  /** Count of user + assistant messages */
  messageCount: number;
  /** Count of tool calls */
  toolCallCount: number;
  /** Whether user-visible subagents exist (excludes internal agents) */
  hasSubagents: boolean;
  /** User-visible subagent IDs (excludes prompt_suggestion, acompact) */
  subagentIds?: string[];
  /** Whether auto-compact occurred during this session */
  hadAutoCompact?: boolean;
  /** Timestamp when auto-compact occurred (ISO string) */
  autoCompactAt?: string;
  /** Token usage stats */
  tokens?: {
    /** Fresh input tokens (non-cached) */
    input: number;
    /** Output tokens generated */
    output: number;
    /** Tokens written to cache */
    cacheCreation: number;
    /** Tokens read from cache */
    cacheRead: number;
  };
  /** File size in bytes */
  fileSizeBytes: number;
  /** File modification time */
  modifiedAt: string;
  /** Session mode: 'planning' if EnterPlanMode tool was called, 'execution' if started with plan trigger */
  mode?: 'planning' | 'execution' | null;
  /** Number of plans detected in this session */
  planCount?: number;
  /** Plan references for display */
  planRefs?: Array<{
    /** Plan title extracted from content */
    title: string;
    /** Source: 'embedded' for inline plans, 'write' for Write tool plans */
    source: 'embedded' | 'write';
    /** Index of the message containing this plan */
    messageIndex: number;
    /** File path if plan was written to disk */
    filePath?: string;
  }>;
  /** Explore agent references */
  exploreAgents?: Array<{
    /** Agent ID from agent_progress */
    id: string;
    /** Short description from Task tool call */
    description: string;
    /** Timestamp when agent was called */
    timestamp: string;
  }>;
  /** Web search references */
  webSearches?: Array<{
    /** Search query */
    query: string;
    /** Number of results returned */
    resultCount: number;
    /** Timestamp of search */
    timestamp: string;
  }>;
}

/**
 * Session index structure
 */
export interface SessionIndex {
  version: "2.0.0";
  lastScanned: string;
  sessions: SessionEntry[];
}

/**
 * Get default empty session index
 */
export function getDefaultSessionIndex(): SessionIndex {
  return {
    version: "2.0.0",
    lastScanned: new Date().toISOString(),
    sessions: [],
  };
}

// Re-export for backwards compatibility (cache/index.ts exports this)
export { decodeProjectPath };

/**
 * Get the cache directory path
 */
export function getCacheDir(): string {
  return JACQUES_CACHE_PATH;
}

/**
 * Get the session index file path
 */
export function getIndexPath(): string {
  return path.join(JACQUES_CACHE_PATH, SESSION_INDEX_FILE);
}

/**
 * Ensure cache directory exists
 */
export async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(JACQUES_CACHE_PATH, { recursive: true });
}

/**
 * Read the session index from disk
 */
export async function readSessionIndex(): Promise<SessionIndex> {
  try {
    const indexPath = getIndexPath();
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content) as SessionIndex;
  } catch {
    return getDefaultSessionIndex();
  }
}

/**
 * Write the session index to disk
 */
export async function writeSessionIndex(index: SessionIndex): Promise<void> {
  await ensureCacheDir();
  const indexPath = getIndexPath();
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

/**
 * Extract session title from parsed JSONL entries.
 * Priority:
 *   1. Summary entry (Claude's auto-generated title)
 *   2. First user message (fallback)
 */
function extractTitle(
  entries: Array<{ type: string; content: { summary?: string; text?: string } }>
): string {
  // Try summary first
  const summaryEntry = entries.find((e) => e.type === "summary" && e.content.summary);
  if (summaryEntry?.content.summary) {
    return summaryEntry.content.summary;
  }

  // Fallback to first user message
  const userMessage = entries.find(
    (e) => e.type === "user_message" && e.content.text
  );
  if (userMessage?.content.text) {
    // Truncate long messages
    const text = userMessage.content.text;
    if (text.length > 100) {
      return text.slice(0, 97) + "...";
    }
    return text;
  }

  return "Untitled Session";
}

/**
 * Extract timestamps from entries
 */
function extractTimestamps(
  entries: Array<{ timestamp: string }>
): { startedAt: string; endedAt: string } {
  if (entries.length === 0) {
    const now = new Date().toISOString();
    return { startedAt: now, endedAt: now };
  }

  // Find earliest and latest timestamps
  let startedAt = entries[0].timestamp;
  let endedAt = entries[0].timestamp;

  for (const entry of entries) {
    if (entry.timestamp < startedAt) {
      startedAt = entry.timestamp;
    }
    if (entry.timestamp > endedAt) {
      endedAt = entry.timestamp;
    }
  }

  return { startedAt, endedAt };
}

/**
 * Plan reference for session display
 */
interface PlanRef {
  title: string;
  source: 'embedded' | 'write';
  messageIndex: number;
  filePath?: string;
}

/**
 * Detect session mode (planning vs execution) and extract plan references.
 *
 * - Planning mode: EnterPlanMode tool was called during session
 * - Execution mode: First user message contains plan trigger pattern
 */
function detectModeAndPlans(entries: ParsedEntry[]): {
  mode: 'planning' | 'execution' | null;
  planRefs: PlanRef[];
} {
  let mode: 'planning' | 'execution' | null = null;
  const planRefs: PlanRef[] = [];

  // Track if EnterPlanMode was called (planning mode)
  let hasEnterPlanMode = false;
  // Track first real user message for execution mode detection
  let firstUserMessageChecked = false;

  entries.forEach((entry, index) => {
    // Check for EnterPlanMode tool call (planning mode)
    if (entry.type === 'tool_call' && entry.content.toolName === 'EnterPlanMode') {
      hasEnterPlanMode = true;
    }

    // Check first user message for execution mode
    if (entry.type === 'user_message' && entry.content.text && !firstUserMessageChecked) {
      const text = entry.content.text.trim();

      // Skip internal command messages
      if (
        text.startsWith('<local-command') ||
        text.startsWith('<command-') ||
        text.length === 0
      ) {
        return;
      }

      firstUserMessageChecked = true;

      // Check if first message matches plan trigger patterns
      for (const pattern of PLAN_TRIGGER_PATTERNS) {
        if (pattern.test(text)) {
          mode = 'execution';

          // Extract plan content and title
          const match = text.match(pattern);
          if (match) {
            const planContent = text.substring(match[0].length).trim();
            // Only count as plan if it has content with markdown heading
            if (planContent.length >= 100 && planContent.includes('#')) {
              const rawTitle = extractPlanTitle(planContent);
              const title = rawTitle.startsWith('Plan:') ? rawTitle : `Plan: ${rawTitle}`;
              planRefs.push({
                title,
                source: 'embedded',
                messageIndex: index,
              });
            }
          }
          break;
        }
      }
    }

    // Check for embedded plans in other user messages (not just first)
    if (entry.type === 'user_message' && entry.content.text && firstUserMessageChecked) {
      const text = entry.content.text.trim();

      // Skip internal command messages
      if (
        text.startsWith('<local-command') ||
        text.startsWith('<command-') ||
        text.length === 0
      ) {
        return;
      }

      // Check for plan trigger patterns in subsequent messages
      for (const pattern of PLAN_TRIGGER_PATTERNS) {
        if (pattern.test(text)) {
          const match = text.match(pattern);
          if (match) {
            const planContent = text.substring(match[0].length).trim();
            if (planContent.length >= 100 && planContent.includes('#')) {
              const rawTitle = extractPlanTitle(planContent);
              const title = rawTitle.startsWith('Plan:') ? rawTitle : `Plan: ${rawTitle}`;
              // Avoid duplicate entries for the same message
              if (!planRefs.some(r => r.messageIndex === index)) {
                planRefs.push({
                  title,
                  source: 'embedded',
                  messageIndex: index,
                });
              }
            }
          }
          break;
        }
      }
    }

    // Check for Write tool calls to plan files
    if (entry.type === 'tool_call' && entry.content.toolName === 'Write') {
      const input = entry.content.toolInput as { file_path?: string; content?: string } | undefined;
      const filePath = input?.file_path || '';
      const content = input?.content || '';

      // Skip code files - they're not plans even if "plan" is in the name
      const codeExtensions = [
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
        '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
        '.vue', '.svelte', '.astro',
        '.css', '.scss', '.less', '.sass',
        '.html', '.htm', '.xml', '.svg',
        '.json', '.yaml', '.yml', '.toml',
        '.sh', '.bash', '.zsh', '.fish',
        '.sql', '.graphql', '.prisma',
      ];
      const isCodeFile = codeExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
      if (isCodeFile) {
        return;
      }

      // Check if path looks like a plan file
      const pathLooksLikePlan =
        filePath.toLowerCase().includes('plan') ||
        filePath.endsWith('.plan.md') ||
        filePath.includes('.jacques/plans/');

      // Check if content looks like markdown plan (not code)
      const hasHeading = /^#+\s+.+/m.test(content);
      const hasListOrParagraph = /^[-*]\s+.+/m.test(content) || content.split('\n\n').length > 1;
      const firstLine = content.split('\n').find(line => line.trim().length > 0) || '';
      const codePatterns = [
        /^import\s+/,
        /^export\s+/,
        /^const\s+/,
        /^function\s+/,
        /^class\s+/,
        /^interface\s+/,
        /^type\s+/,
      ];
      const looksLikeCode = codePatterns.some(p => p.test(firstLine.trim()));
      const looksLikeMarkdown = hasHeading && hasListOrParagraph && !looksLikeCode;

      if (pathLooksLikePlan && looksLikeMarkdown) {
        const rawTitle = extractPlanTitle(content);
        const title = rawTitle.startsWith('Plan:') ? rawTitle : `Plan: ${rawTitle}`;
        planRefs.push({
          title,
          source: 'write',
          messageIndex: index,
          filePath,
        });
      }
    }
  });

  // Planning mode takes precedence if EnterPlanMode was called
  if (hasEnterPlanMode) {
    mode = 'planning';
  }

  return { mode, planRefs };
}

/**
 * Explore agent reference for session display
 */
interface ExploreAgentRef {
  id: string;
  description: string;
  timestamp: string;
}

/**
 * Web search reference for session display
 */
interface WebSearchRef {
  query: string;
  resultCount: number;
  timestamp: string;
}

/**
 * Extract explore agents and web searches from entries
 */
function extractAgentsAndSearches(entries: ParsedEntry[]): {
  exploreAgents: ExploreAgentRef[];
  webSearches: WebSearchRef[];
} {
  const exploreAgents: ExploreAgentRef[] = [];
  const webSearches: WebSearchRef[] = [];
  const seenAgentIds = new Set<string>();
  const seenQueries = new Set<string>();

  for (const entry of entries) {
    // Extract explore agents from agent_progress entries
    if (entry.type === 'agent_progress' && entry.content.agentType === 'Explore') {
      const agentId = entry.content.agentId;
      if (agentId && !seenAgentIds.has(agentId)) {
        seenAgentIds.add(agentId);
        exploreAgents.push({
          id: agentId,
          description: entry.content.agentDescription || 'Explore codebase',
          timestamp: entry.timestamp,
        });
      }
    }

    // Extract web searches from web_search entries with results
    if (entry.type === 'web_search' && entry.content.searchType === 'results') {
      const query = entry.content.searchQuery;
      if (query && !seenQueries.has(query)) {
        seenQueries.add(query);
        webSearches.push({
          query,
          resultCount: entry.content.searchResultCount || 0,
          timestamp: entry.timestamp,
        });
      }
    }
  }

  return { exploreAgents, webSearches };
}

/**
 * Extract metadata from a single JSONL file
 */
export async function extractSessionMetadata(
  jsonlPath: string,
  projectPath: string,
  projectSlug: string
): Promise<SessionEntry | null> {
  try {
    // Get file stats
    const stats = await fs.stat(jsonlPath);
    const sessionId = path.basename(jsonlPath, ".jsonl");

    // Parse JSONL to get metadata
    const entries = await parseJSONL(jsonlPath);

    if (entries.length === 0) {
      return null;
    }

    // Get statistics
    const entryStats = getEntryStatistics(entries);

    // Get timestamps
    const { startedAt, endedAt } = extractTimestamps(entries);

    // Get title
    const title = extractTitle(entries);

    // Check for subagents
    const subagentFiles = await listSubagentFiles(jsonlPath);

    // Filter out internal agents (prompt_suggestion, acompact) from user-visible count
    // These are system agents that shouldn't appear in the subagent count
    const userVisibleSubagents = subagentFiles.filter((f: SubagentFile) =>
      !f.agentId.startsWith('aprompt_suggestion-') &&
      !f.agentId.startsWith('acompact-')
    );

    // Track if auto-compact occurred (for showing indicator in UI)
    const autoCompactFile = subagentFiles.find((f: SubagentFile) =>
      f.agentId.startsWith('acompact-')
    );
    const hadAutoCompact = !!autoCompactFile;
    const autoCompactAt = autoCompactFile?.modifiedAt.toISOString();

    const hasSubagents = userVisibleSubagents.length > 0;

    // Detect mode and plans
    const { mode, planRefs } = detectModeAndPlans(entries);

    // Extract explore agents and web searches
    const { exploreAgents, webSearches } = extractAgentsAndSearches(entries);

    // Use LAST turn's input tokens for context window size
    // Each turn reports the FULL context, so summing would overcount
    // Total context = fresh input + cache read (cache_creation is subset of fresh, not additional)
    const totalInput = entryStats.lastInputTokens + entryStats.lastCacheRead;
    // Use tiktoken-estimated output tokens (cumulative - each turn generates NEW output)
    const totalOutput = entryStats.totalOutputTokensEstimated;
    const hasTokens = totalInput > 0 || totalOutput > 0;

    return {
      id: sessionId,
      jsonlPath,
      projectPath,
      projectSlug,
      title,
      startedAt,
      endedAt,
      messageCount: entryStats.userMessages + entryStats.assistantMessages,
      toolCallCount: entryStats.toolCalls,
      hasSubagents,
      subagentIds: hasSubagents
        ? userVisibleSubagents.map((f: SubagentFile) => f.agentId)
        : undefined,
      hadAutoCompact: hadAutoCompact || undefined,
      autoCompactAt: autoCompactAt || undefined,
      tokens: hasTokens ? {
        input: totalInput,
        output: totalOutput,
        cacheCreation: entryStats.lastCacheCreation,
        cacheRead: entryStats.lastCacheRead,
      } : undefined,
      fileSizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      mode: mode || undefined,
      planCount: planRefs.length > 0 ? planRefs.length : undefined,
      planRefs: planRefs.length > 0 ? planRefs : undefined,
      exploreAgents: exploreAgents.length > 0 ? exploreAgents : undefined,
      webSearches: webSearches.length > 0 ? webSearches : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * List all project directories in ~/.claude/projects/
 */
export async function listAllProjects(): Promise<
  Array<{ encodedPath: string; projectPath: string; projectSlug: string }>
> {
  const projects: Array<{
    encodedPath: string;
    projectPath: string;
    projectSlug: string;
  }> = [];

  try {
    const entries = await fs.readdir(CLAUDE_PROJECTS_PATH, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = await decodeProjectPath(entry.name);
        const projectSlug = path.basename(projectPath);

        projects.push({
          encodedPath: path.join(CLAUDE_PROJECTS_PATH, entry.name),
          projectPath,
          projectSlug,
        });
      }
    }
  } catch {
    // Projects directory doesn't exist
  }

  return projects;
}

/**
 * Scan all sessions and build the index
 */
export async function buildSessionIndex(options?: {
  /** Progress callback - called for each session scanned */
  onProgress?: (progress: {
    phase: "scanning" | "processing";
    total: number;
    completed: number;
    current: string;
  }) => void;
}): Promise<SessionIndex> {
  const { onProgress } = options || {};
  const sessions: SessionEntry[] = [];

  onProgress?.({
    phase: "scanning",
    total: 0,
    completed: 0,
    current: "Scanning projects...",
  });

  // Get all projects
  const projects = await listAllProjects();

  // Collect all JSONL files first
  const jsonlFiles: Array<{
    filePath: string;
    projectPath: string;
    projectSlug: string;
  }> = [];

  for (const project of projects) {
    try {
      const entries = await fs.readdir(project.encodedPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          jsonlFiles.push({
            filePath: path.join(project.encodedPath, entry.name),
            projectPath: project.projectPath,
            projectSlug: project.projectSlug,
          });
        }
      }
    } catch {
      // Skip projects we can't read
    }
  }

  // Process each JSONL file
  for (let i = 0; i < jsonlFiles.length; i++) {
    const file = jsonlFiles[i];
    const sessionId = path.basename(file.filePath, ".jsonl");

    onProgress?.({
      phase: "processing",
      total: jsonlFiles.length,
      completed: i,
      current: `${file.projectSlug}/${sessionId.substring(0, 8)}...`,
    });

    const metadata = await extractSessionMetadata(
      file.filePath,
      file.projectPath,
      file.projectSlug
    );

    if (metadata) {
      sessions.push(metadata);
    }
  }

  // Sort by modification time (newest first)
  sessions.sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  const index: SessionIndex = {
    version: "2.0.0",
    lastScanned: new Date().toISOString(),
    sessions,
  };

  // Save to disk
  await writeSessionIndex(index);

  onProgress?.({
    phase: "processing",
    total: jsonlFiles.length,
    completed: jsonlFiles.length,
    current: "Complete",
  });

  return index;
}

/**
 * Get the session index, building if necessary
 * @param maxAge Maximum age in milliseconds before rebuilding (default: 5 minutes)
 */
export async function getSessionIndex(
  options?: { maxAge?: number }
): Promise<SessionIndex> {
  const { maxAge = 5 * 60 * 1000 } = options || {};

  const existing = await readSessionIndex();

  // Check if index is fresh enough
  const lastScanned = new Date(existing.lastScanned).getTime();
  const age = Date.now() - lastScanned;

  if (age < maxAge && existing.sessions.length > 0) {
    return existing;
  }

  // Rebuild index
  return buildSessionIndex();
}

/**
 * Get a single session entry by ID
 */
export async function getSessionEntry(
  sessionId: string
): Promise<SessionEntry | null> {
  const index = await getSessionIndex();
  return index.sessions.find((s) => s.id === sessionId) || null;
}

/**
 * Get sessions grouped by project
 */
export async function getSessionsByProject(): Promise<
  Map<string, SessionEntry[]>
> {
  const index = await getSessionIndex();
  const byProject = new Map<string, SessionEntry[]>();

  for (const session of index.sessions) {
    const existing = byProject.get(session.projectSlug) || [];
    existing.push(session);
    byProject.set(session.projectSlug, existing);
  }

  return byProject;
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<{
  totalSessions: number;
  totalProjects: number;
  totalSizeBytes: number;
  lastScanned: string;
}> {
  const index = await getSessionIndex();

  // Count unique projects
  const projects = new Set(index.sessions.map((s) => s.projectSlug));

  // Sum file sizes
  const totalSize = index.sessions.reduce((sum, s) => sum + s.fileSizeBytes, 0);

  return {
    totalSessions: index.sessions.length,
    totalProjects: projects.size,
    totalSizeBytes: totalSize,
    lastScanned: index.lastScanned,
  };
}

/**
 * Invalidate the index (force rebuild on next read)
 */
export async function invalidateIndex(): Promise<void> {
  try {
    const indexPath = getIndexPath();
    await fs.unlink(indexPath);
  } catch {
    // Index doesn't exist, nothing to do
  }
}
