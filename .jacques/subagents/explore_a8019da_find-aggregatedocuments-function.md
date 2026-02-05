# Explore: Find aggregateDocuments function

> Session: `eb1a87a2-a33d-4aa4-a580-f36814767d8f`
> Date: 2026-02-03
> Tokens: ~24 950

---

Perfect! I found the `aggregateDocuments` function and all plan-related imports and logic. Here's the complete analysis:

## Full `aggregateDocuments` Function

**Lines 198-222:**

```typescript
function aggregateDocuments(savedSessions: SessionEntry[]) {
  const plans: PlanItem[] = [];
  const explorations: ExploreItem[] = [];
  const webSearches: WebSearchItem[] = [];

  for (const session of savedSessions) {
    if (session.planRefs) {
      for (const ref of session.planRefs) {
        plans.push({ title: ref.title.replace(/^Plan:\s*/i, ''), sessionId: session.id });
      }
    }
    if (session.exploreAgents) {
      for (const agent of session.exploreAgents) {
        explorations.push({ description: agent.description, sessionId: session.id, tokenCost: agent.tokenCost });
      }
    }
    if (session.webSearches) {
      for (const search of session.webSearches) {
        webSearches.push({ query: search.query, sessionId: session.id });
      }
    }
  }

  return { plans, explorations, webSearches };
}
```

## Plan-Related Aggregation Logic

The function performs these plan aggregations:

1. **Line 204**: Checks if `session.planRefs` exists
2. **Line 206**: Strips the "Plan: " prefix from each plan title using `.replace(/^Plan:\s*/i, '')`
3. **Line 206**: Creates a `PlanItem` with title and session ID
4. **Lines 199**: Returns aggregated plans as part of the result object

## Plan-Related Imports

**Lines 1-19 (imports section):**

```typescript
import { useMemo, useState, useEffect } from 'react';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { useSessionBadges } from '../hooks/useSessionBadges';
import { listSessionsByProject, type SessionEntry } from '../api';
import { colors } from '../styles/theme';
import { SectionHeader, Badge } from '../components/ui';
import { SessionCard } from '../components/SessionCard';
import { ActiveSessionViewer } from '../components/ActiveSessionViewer';
import { PlanIcon, AgentIcon, StatusDot } from '../components/Icons';  // ← PlanIcon imported here
import { Globe, Terminal } from 'lucide-react';
import type { Session } from '../types';
```

## Plan-Related Type Definition

**Lines 112:**

```typescript
interface PlanItem { title: string; sessionId: string; }
```

## Plan Usage Throughout Component

1. **Line 206**: Plan aggregation in `aggregateDocuments`
2. **Lines 204-208**: Plan data extraction from `session.planRefs`
3. **Line 137**: Plan counting in `computeStats` function
4. **Lines 174-178**: Plan title detection in `toSessionListItems`
5. **Line 462**: Plans stat pill display in header
6. **Lines 558-560**: Plan icon display in session history
7. **Lines 587-592**: Plan count badge display in history metadata
8. **Lines 649-659**: Plans asset column with title "PLANS"
9. **Lines 652-655**: Plan items mapped to asset cards with PlanIcon

The function cleanly separates plans, explorations, and web searches into distinct collections for display in the Assets grid.