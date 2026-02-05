# Explore: Explore Claude Code skill discovery

> Session: `38ceac2d-df45-4064-8a36-488d23eaa7f3`
> Date: 2026-01-31
> Tokens: ~29 733

---

Perfect! Now I have comprehensive information. Let me compile my findings into a clear report.

## Summary: Claude Code Skills Discovery and File Format

Based on my investigation of the codebase and official Claude Code documentation, here's what I found about why `~/.claude/skills/handoff.skill.md` wouldn't be discovered:

### **1. Correct Directory Structure**

Claude Code looks for skills in **specific directory locations**:

| Location | Path | Scope |
|----------|------|-------|
| **Personal** | `~/.claude/skills/<skill-name>/SKILL.md` | All projects |
| **Project** | `.claude/skills/<skill-name>/SKILL.md` | Current project only |
| **Nested** | `<subdirectory>/.claude/skills/<skill-name>/SKILL.md` | Monorepo support |

**Your file location is incorrect**: `~/.claude/skills/handoff.skill.md` should be `~/.claude/skills/handoff/SKILL.md` (note: it's a **directory** containing `SKILL.md`, not a single `.skill.md` file).

### **2. Required File Format**

Every skill **must** have a `SKILL.md` file (exact filename) with YAML frontmatter:

```yaml
---
name: handoff
description: What this skill does and when to use it
---

# Main instructions for Claude to follow...
```

**Required frontmatter fields:**
- `name`: Lowercase, numbers, hyphens only (max 64 chars) - this becomes the `/slash-command`
- `description`: Non-empty, max 1024 chars - tells Claude when to use the skill

**Optional fields:**
- `disable-model-invocation: true` - Only manual invocation via `/handoff`
- `user-invocable: false` - Only Claude can invoke it
- `allowed-tools: Read, Grep` - Restrict which tools Claude can use
- `context: fork` - Run in isolated subagent context

### **3. File Organization**

Each skill is a **directory** with this structure:

```
~/.claude/skills/handoff/
├── SKILL.md              # Main instructions (REQUIRED)
├── template.md           # Optional template for Claude to fill in
├── examples/
│   └── sample.md         # Optional example outputs
└── scripts/
    └── helper.py         # Optional executable scripts
```

- Only `SKILL.md` is required
- Supporting files are optional and loaded on-demand
- Reference supporting files from `SKILL.md` so Claude knows when to load them

### **4. Discovery Mechanism**

Claude Code discovers skills by:
1. **Scanning** configured directories at startup (`~/.claude/skills/`, `.claude/skills/`, etc.)
2. **Reading SKILL.md** from each skill directory
3. **Extracting metadata** from YAML frontmatter (`name` and `description`)
4. **Building context** with skill descriptions so Claude knows what's available
5. **Loading full instructions** only when the skill is triggered (by you or Claude)

**Important**: Skill descriptions are **always loaded into context**, but full `SKILL.md` content only loads when invoked.

### **5. Nested Directory Support (2026 Feature)**

Claude Code automatically discovers skills from **nested `.claude/skills/` directories**. If you're working in `packages/frontend/`, Claude also looks for skills in `packages/frontend/.claude/skills/`. This supports monorepo setups.

### **6. Priority When Skills Share Names**

If the same skill name exists at multiple levels:
- **Enterprise** (managed settings) > **Personal** (`~/.claude`) > **Project** (`.claude/`)
- Skills take precedence over commands (if a skill and command share a name)

### **Why Your File Isn't Discovered**

`~/.claude/skills/handoff.skill.md` fails because:

1. ❌ File extension is `.skill.md` instead of **`SKILL.md`** (case-sensitive)
2. ❌ It's a **single file**, not a **directory with SKILL.md inside**
3. ❌ It should be at `~/.claude/skills/handoff/SKILL.md` (directory structure)

### **How to Fix It**

Create the correct structure:

```bash
mkdir -p ~/.claude/skills/handoff
# Then create ~/.claude/skills/handoff/SKILL.md with YAML frontmatter
```

Example `~/.claude/skills/handoff/SKILL.md`:

```yaml
---
name: handoff
description: Create handoff files for context compaction
disable-model-invocation: false
---

# Handoff Files

When creating handoff files:
1. Summarize current progress
2. Highlight important context
3. Format for easy parsing
4. Save with timestamp
```

### **Note on Configuration**

There's **no settings.json configuration** needed for skill discovery - Claude Code discovers skills **automatically** by scanning the directories. Skills are filesystem-based, not configured in settings.

---

Sources:
- [Extend Claude with skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Agent Skills - Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Code Merges Slash Commands Into Skills - Medium](https://medium.com/@joe.njenga/claude-code-merges-slash-commands-into-skills-dont-miss-your-update-8296f3989697)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)