# Explore: Explore GUI structure and styling

> Session: `4adabb3c-0ace-44cc-b68d-ec4f94533cc4`
> Date: 2026-02-01
> Tokens: ~38 911

---

Perfect! Now I have a comprehensive understanding of the GUI structure. Let me create a detailed report for you:

## GUI Exploration Report: Component Structure, Styling & Patterns

### 1. **Color Scheme & Theme**

The GUI uses a **dark terminal aesthetic** with a consistent color palette defined in `gui/src/styles/theme/colors.ts`:

**Primary Colors:**
- **Accent (Coral/Peach)**: `#E67E52` (buttons, links, active states)
  - Light variant: `#F09070` (hover states)
  - Dark variant: `#D06840` (active/pressed states)
  - Orange variant: `#FF6600` (project names, mascot)

**Background Palette:**
- **Primary**: `#0d0d0d` (deepest dark, main background)
- **Secondary**: `#1a1a1a` (cards, sidebar)
- **Elevated**: `#252525` (hover states, modals, headers)
- **Input**: `#2a2a2a` (form fields, code blocks)

**Text Colors:**
- **Primary**: `#ffffff` (headings, body text)
- **Secondary**: `#8B9296` (descriptions, timestamps)
- **Muted**: `#6B7075` (placeholders, disabled states)

**Semantic Colors:**
- **Success**: `#4ADE80` (connected, saved)
- **Warning**: `#FBBF24` (approaching limits)
- **Danger**: `#EF4444` (disconnected, failed)

**Borders:**
- **Default**: `#E67E52` (matches accent)
- **Subtle**: `#3a3a3a` (dividers)

---

### 2. **Component Structure & Patterns**

**File Organization:**
```
gui/src/
├── components/
│   ├── Layout.tsx           # Main sidebar + nav layout
│   ├── SessionCard.tsx      # Session display cards
│   ├── ContextMeter.tsx     # Context progress visualization
│   ├── ProjectSelector.tsx  # Project scope filter
│   ├── LogPanel.tsx         # Server logs display
│   └── Conversation/
│       ├── ConversationViewer.tsx  # Full conversation display
│       ├── UserMessage.tsx         # User message rendering
│       ├── AssistantMessage.tsx    # Assistant message rendering
│       ├── CodeBlock.tsx           # Syntax-highlighted code
│       ├── CollapsibleBlock.tsx    # Collapsible sections
│       └── QuestionNavigator.tsx   # Jump-to-question sidebar
├── pages/
│   ├── Dashboard.tsx        # Session monitoring
│   ├── Conversations.tsx    # Saved conversations list
│   ├── Archive.tsx          # Archive search (PLACEHOLDER - coming soon)
│   ├── Context.tsx
│   ├── Settings.tsx
│   └── Sources.tsx
├── styles/theme/
│   ├── colors.ts           # Color definitions
│   └── index.ts            # Typography, spacing, shadows
└── api/
    ├── config.ts           # API client (HTTP requests)
    └── index.ts            # Exports
```

---

### 3. **Styling Patterns**

**Inline CSS Objects** (not separate CSS files):
- All components use `React.CSSProperties` style objects
- Theme colors imported from `colors` at top of file
- Responsive styles handled via JavaScript (no CSS media queries visible)
- Transitions: `150ms ease` (fast), `250ms ease` (base), `400ms ease` (slow)

**Common Style Patterns:**

**Card Components:**
```typescript
{
  backgroundColor: colors.bgSecondary,
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: '8px',
  padding: '16px',
  transition: 'all 150ms ease',
}
```

**Button Styles:**
```typescript
{
  padding: '6px 12px',
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: '4px',
  backgroundColor: 'transparent',
  color: colors.textSecondary,
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 150ms ease',
}
```

**Typography Scale:**
```typescript
fontSize: {
  xs: '11px',
  sm: '12px',
  base: '14px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
}
```

**Spacing Scale (4px base):**
- 1: 4px, 2: 8px, 3: 12px, 4: 16px, 5: 20px, 6: 24px, etc.

---

### 4. **ConversationViewer Component (Existing)**

**Location:** `gui/src/components/Conversation/ConversationViewer.tsx`

**Features:**
- **Filter Tabs**: "All", "Without Tools", "Messages Only" 
- **Expand/Collapse All**: Toggle all message content expansion
- **Keyboard Navigation**: `[` prev question, `]` next question, `e` expand, `c` collapse
- **Question Navigator**: Sidebar showing user questions (scrollable)
- **Footer**: Message count, estimated tokens, technologies used
- **Layout**: 3-part layout (header, content area with messages + navigator, footer)

**Message Components:**
- **UserMessage**: Simple text display with timestamp, bordered container
- **AssistantMessage**: Complex content with thinking blocks, tool calls, code blocks
- **CollapsibleBlock**: Expandable sections for thinking, tools, results
- **CodeBlock**: Syntax-highlighted code with language detection

**Styling Approach:**
- Messages wrapped in `bgSecondary` cards with `borderSubtle` borders
- Headers use `bgElevated` background
- Tool content uses monospace font with `bgPrimary` background
- Error results colored in `danger` red

---

### 5. **Archive.tsx Current State**

**Location:** `gui/src/pages/Archive.tsx`

**Current Status:** PLACEHOLDER - Incomplete implementation

**What Exists:**
- Basic container with max-width 1200px
- Title: "Archive"
- Description text
- Search input (styled, but non-functional)
- Placeholder with emoji and "Archive search coming soon" message

**Styling Used:**
```typescript
{
  maxWidth: '1200px',
  title: { fontSize: '24px', fontWeight: 600 },
  searchInput: { 
    maxWidth: '500px',
    padding: '12px 16px',
    backgroundColor: colors.bgInput,
    border: `1px solid ${colors.borderSubtle}`,
  },
  placeholder: {
    padding: '64px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px dashed ${colors.borderSubtle}`,
  }
}
```

---

### 6. **API Client Pattern**

**Location:** `gui/src/api/config.ts`

**Key Points:**
- API_URL uses `import.meta.env.DEV` to detect dev vs production
- Dev: `http://localhost:4243/api`
- Production: `/api` (same origin)
- Standard fetch-based HTTP client
- Error handling extracts `.error` from response body
- Functions are async/Promise-based

**Exported Functions:**
- `getSourcesStatus()` - GET `/api/sources/status`
- `configureGoogleDocs()` - POST `/api/sources/google`
- `disconnectGoogleDocs()` - DELETE `/api/sources/google`
- `configureNotion()` - POST `/api/sources/notion`
- `disconnectNotion()` - DELETE `/api/sources/notion`

---

### 7. **Navigation & Layout**

**Main Layout** (`Layout.tsx`):
- **Sidebar** (240px width, bgSecondary, left border)
  - Logo section (32x32 mascot image + "Jacques" text)
  - Project Selector dropdown
  - Navigation (5 items): Dashboard, Conversations, Archive, Context, Settings
  - Sources section (Obsidian, Google Docs, Notion with status dots)
  - Settings link at bottom
- **Main content area** (flex: 1, 24px padding, bgPrimary)
- **Log Panel** (bottom, server logs)

**Navigation Style:**
- Active states: `bgElevated` background + `accent` color
- Icons: Unicode symbols (◉, ▸, ⚙, ⚡, 💤, etc.)
- Inactive text: `textSecondary`

---

### 8. **Key Design Decisions**

1. **All inline styles** - No CSS files, pure React object styling
2. **Color consistency** - All components import `colors` from theme
3. **Accessible semantics** - Proper button types, roles
4. **Responsive values** - Fonts sizes vary by importance (title, header, body, small)
5. **Transitions** - Hover/active states smooth (150ms)
6. **Dark terminal aesthetic** - High contrast, comfortable for long sessions
7. **Sidebar + main layout** - Common pattern for dashboards
8. **Composition over complex styling** - Reusable component patterns

---

### 9. **Ready-to-Use Components**

For implementing the archive browser, you can reuse:
- **SessionCard** pattern (cards with borders, headers, footers)
- **ConversationViewer** - Already handles conversation display
- **Filter tabs pattern** - Multiple filter options with active state
- **Collapsible blocks** - For expanding/collapsing archive entries
- **Color scheme** - Already imported everywhere
- **Typography scale** - Established font sizes

---

### Summary

The GUI is a **React + Vite** application with:
- **Consistent dark terminal theme** using coral accent (#E67E52)
- **Component-based architecture** with inline styling
- **Reusable patterns** for cards, buttons, filters, and message displays
- **Functional ConversationViewer** ready for viewing saved conversations
- **Placeholder Archive.tsx** waiting for implementation
- **API client** ready for backend integration

The archive browser implementation should follow these patterns: use inline styles with the color theme, create reusable filter/list components, and leverage the existing API client pattern for data fetching.