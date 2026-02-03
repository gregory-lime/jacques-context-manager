/**
 * Plan Viewer View Component
 *
 * Displays the full content of a plan file with:
 * - Scrollable markdown content
 * - Header showing plan title and metadata
 * - Simple controls
 */

import React from "react";
import { Box, Text } from "ink";
import type { PlanEntry } from "@jacques/core";
import { dotLine, sectionLine } from "./ascii-art/index.js";

// Colors (matching existing theme)
const ACCENT_COLOR = "#E67E52";
const MUTED_TEXT = "#8B9296";

// Number of content lines visible (excluding header/footer)
export const PLAN_VIEWER_VISIBLE_LINES = 15;

interface PlanViewerViewProps {
  plan: PlanEntry;
  content: string;
  terminalWidth: number;
  terminalHeight: number;
  scrollOffset: number;
}

/**
 * Format a date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Split content into lines, handling word wrap
 */
function wrapContent(content: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const rawLines = content.split("\n");

  for (const rawLine of rawLines) {
    if (rawLine.length <= maxWidth) {
      lines.push(rawLine);
    } else {
      // Word wrap long lines
      let remaining = rawLine;
      while (remaining.length > maxWidth) {
        // Find last space before maxWidth
        let breakPoint = remaining.lastIndexOf(" ", maxWidth);
        if (breakPoint === -1 || breakPoint < maxWidth / 2) {
          // No good break point, force break
          breakPoint = maxWidth;
        }
        lines.push(remaining.slice(0, breakPoint));
        remaining = remaining.slice(breakPoint).trimStart();
      }
      if (remaining) {
        lines.push(remaining);
      }
    }
  }

  return lines;
}

/**
 * Render a line of markdown content with basic formatting
 */
function renderLine(line: string, maxWidth: number): React.ReactElement {
  const trimmed = line.trimStart();

  // Heading detection
  if (trimmed.startsWith("# ")) {
    return (
      <Text bold color={ACCENT_COLOR}>
        {line.slice(0, maxWidth)}
      </Text>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <Text bold color="white">
        {line.slice(0, maxWidth)}
      </Text>
    );
  }
  if (trimmed.startsWith("### ")) {
    return (
      <Text bold>
        {line.slice(0, maxWidth)}
      </Text>
    );
  }

  // List items
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
    return <Text>{line.slice(0, maxWidth)}</Text>;
  }

  // Code blocks (inline backticks - simplified)
  if (trimmed.startsWith("```")) {
    return <Text color={MUTED_TEXT}>{line.slice(0, maxWidth)}</Text>;
  }

  // Regular text
  return <Text>{line.slice(0, maxWidth)}</Text>;
}

export function PlanViewerView({
  plan,
  content,
  terminalWidth,
  terminalHeight,
  scrollOffset,
}: PlanViewerViewProps): React.ReactElement {
  // Wrap content to terminal width
  const contentWidth = Math.min(terminalWidth - 4, 80);
  const wrappedLines = wrapContent(content, contentWidth);
  const totalLines = wrappedLines.length;

  // Calculate visible window
  const visibleLines = Math.min(PLAN_VIEWER_VISIBLE_LINES, terminalHeight - 10);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleLines < totalLines;

  // Get visible content
  const visibleContent = wrappedLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={terminalWidth}>
      {/* Top border */}
      <Text color={MUTED_TEXT}>{dotLine(terminalWidth)}</Text>

      {/* Header */}
      <Box marginTop={1} flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between" width={terminalWidth - 2}>
          <Text bold color={ACCENT_COLOR}>
            {plan.title.length > terminalWidth - 20
              ? plan.title.slice(0, terminalWidth - 23) + "..."
              : plan.title}
          </Text>
          <Text color={MUTED_TEXT}>{formatDate(plan.updatedAt)}</Text>
        </Box>
        <Text color={MUTED_TEXT}>{sectionLine(terminalWidth - 2)}</Text>
      </Box>

      {/* Scroll indicator (up) */}
      {canScrollUp && (
        <Text color={MUTED_TEXT}>
          {"  "}▲ {scrollOffset} lines above
        </Text>
      )}

      {/* Content */}
      <Box flexDirection="column" marginLeft={2} marginTop={canScrollUp ? 0 : 1}>
        {visibleContent.map((line, i) => (
          <Box key={scrollOffset + i}>
            {renderLine(line, contentWidth)}
          </Box>
        ))}
      </Box>

      {/* Scroll indicator (down) */}
      {canScrollDown && (
        <Text color={MUTED_TEXT}>
          {"  "}▼ {totalLines - scrollOffset - visibleLines} lines below
        </Text>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text color={MUTED_TEXT}>{dotLine(terminalWidth)}</Text>
      </Box>
      <Text color={MUTED_TEXT}>
        {" "}[↑↓] Scroll   [Esc] Back to Dashboard
      </Text>
      <Text color={MUTED_TEXT}>{dotLine(terminalWidth)}</Text>
    </Box>
  );
}
