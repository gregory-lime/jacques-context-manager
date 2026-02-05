# Explore: Verify migration results

> Session: `eb1a87a2-a33d-4aa4-a580-f36814767d8f`
> Date: 2026-02-03
> Tokens: ~25 547

---

Here's the report on the plans arrays from the three files:

## File 1: `/Users/gole/Desktop/jacques-context-manager/.jacques/index.json`

**Plans Count:** 5 entries

**Structure Check:**
- All 5 entries have `contentHash` fields ✓
- No missing hashes ✓
- No absolute paths (all use relative paths starting with `plans/`) ✓
- No duplicate titles ✓
- All filenames are unique ✓

**List of titles:**
1. Archive Display & Filtering Improvements
2. Archive Re-initialization with New Content Types
3. Plan: Claude Code Operations Logging with Multi-Console GUI
4. Plan: Fix LLM Handoff to Use Compact Context
5. Archive Browser Implementation Plan

---

## File 2: `/Users/gole/Desktop/jacques/context/manager/.jacques/index.json`

**Plans Count:** 43 entries

**Structure Check:**
- All 43 entries have `contentHash` fields ✓
- No missing hashes ✓
- No absolute paths (all use relative paths starting with `plans/`) ✓
- **DUPLICATE TITLES FOUND:** "Session Handoff" appears TWICE (IDs: `2026-02-01_session-handoff-v2` and `2026-02-01_session-handoff`)
- **DUPLICATE FILENAMES** (different titles): `2026-02-01_archive-browser-implementation-plan.md` and `2026-02-01_archive-display-filtering-improvements.md` appear in both original and alternate locations
- **DUPLICATE CONTENT HASHES:** Several entries share identical `contentHash` values:
  - Hash `62f0e6062917d75a935ad6b9bff82aa816c95e17fd4b6500fc0f6d6659e0a3e1` (Archive Browser Implementation Plan - appears twice with different titles/filenames)
  - Hash `9a366c7622788c6b12314b2fbdcfd1a16aaa8a86abbd87a580564e10f4a10d97` (Archive Display & Filtering Improvements - appears twice)
  - Hash `cdb04174bdf64a78d585154378e7e683667acdb67f9a1c69d4dc7ec6c8d4bd80` (Archive Re-initialization - appears twice)
  - Hash `2fc9d53b69a239dccfaf6b3d527e352e3a9503f458880e8ceac18505f42c1d69` (Claude Code Operations - appears twice)
  - Hash `2719125ba4e29f7728cb093d78322f87ddf9db438c497917dce3e673224248fa` (Fix LLM Handoff - appears twice)

---

## File 3: `/Users/gole/Desktop/marriage/story/.jacques/index.json`

**Plans Count:** 1 entry

**Structure Check:**
- The single entry has `contentHash` field ✓
- No missing hashes ✓
- No absolute paths (uses relative path `plans/`) ✓
- No duplicates (only one entry) ✓

**Title:**
1. Plan: Split PDF into Individual Pages

---

## Summary

- **jacques-context-manager**: Clean, 5 plans, all valid
- **jacques/context/manager**: 43 plans with significant duplication (multiple entries with identical content hashes, suggesting these were extracted from the same session and indexed multiple times)
- **marriage/story**: Clean, 1 plan, all valid