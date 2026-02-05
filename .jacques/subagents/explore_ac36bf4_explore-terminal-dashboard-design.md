# Explore: Explore terminal dashboard design

> Session: `7eddbf0b-5e1c-4ac6-be36-93651d5e23ee`
> Date: 2026-02-03
> Tokens: ~44 148

---

Perfect! Now let me compile my findings into a comprehensive design DNA document. Let me create a summary report:

## Terminal Dashboard Design Language - Visual DNA Analysis

Based on my exploration of the Jacques terminal dashboard codebase, here's the complete design DNA that should be ported to the web GUI:

### 1. **Color Palette - Coral/Peach Accent System**

The terminal dashboard uses a minimalist dark theme with a distinctive coral accent:

| Color | Purpose | Value |
|-------|---------|-------|
| **Primary Accent (Coral/Peach)** | Progress bars, important highlights, mascot details | `#E67E52` |
| **Orange Variant** | Borders, menu items, mascot | `#FF6600` |
| **Accent Light** | Hover states, emphasis | `#F09070` |
| **Accent Dark** | Active states, depth | `#D06840` |
| **Text Primary** | Headings, main body | `#ffffff` |
| **Text Secondary** | Descriptions, metadata | `#8B9296` |
| **Text Muted** | Placeholders, disabled | `#6B7075` |
| **Background Primary** | Main surface | `#0d0d0d` |
| **Background Secondary** | Cards, sidebar | `#1a1a1a` |
| **Background Elevated** | Hover, modals | `#252525` |
| **Semantic - Success** | Connected, saved | `#4ADE80` (green) |
| **Semantic - Warning** | Approaching limits, ~70% context | `#FBBF24` (yellow) |
| **Semantic - Danger** | Disconnected, failed, ≥80% context | `#EF4444` (red) |
| **Progress Empty** | Unused portions of bars | `#8B9296` |

### 2. **Unicode Block Art & ASCII Patterns**

The terminal uses specific Unicode characters for visual impact:

**Progress Bars:**
- **Filled**: `█` (U+2588, Full Block)
- **Empty**: `░` (U+2591, Light Shade)
- **Shading gradient**: `▓ ▒ ░` (Dark, Medium, Light Shade)

**Borders & Separators:**
- **Box corners**: `╭ ╮ ╰ ╯` (Rounded corners)
- **Horizontal lines**: `─` (Box Drawing Horizontal) or `…` (Horizontal Ellipsis - zen borders)
- **Vertical lines**: `│` (Box Drawing Vertical)
- **Section dividers**: `─` repeats for clean breaks

**Mascot Elements:**
- **Hair**: `░▒▓` (gradient shading)
- **Eyes**: `º` (degree symbol for pupils)
- **Eye frames**: `▛ ▜ ▐ ▌` (Unicode box elements)
- **Mouth**: `─‿─` (simple horizontal line with curve)
- **Pipe**: ▖ (subtle)

**Scene/Background Art:**
- **Stars**: `*` characters scattered
- **Night sky blocks**: `█ ▓ ▒ ░` arranged for layered depth
- Two scene versions: SCENE_FULL (12 lines, 52 chars for ≥90 width terminals) and SCENE_COMPACT (4 lines, 30 chars for 70-89 width)

### 3. **Layout & Spacing Principles**

**Fixed Viewport Heights:**
- Content box: 10 rows consistently
- Session list: Limited to 10 items visible (scrollable)
- Responsive breakpoints:
  - **≥90 chars wide**: Full scene + horizontal layout
  - **70-89 chars wide**: Compact scene + horizontal layout
  - **<70 chars wide**: No scene, vertical layout only

**Border Box Dimensions:**
- Main menu box: 43 chars wide
- Content boxes: 48 chars wide (default)
- All calculations pixel-perfect from `terminalWidth`

**Spacing:**
- Single empty lines for breathing room (not double)
- Consistent left margin padding (2-4 spaces)
- No excessive padding - minimalist aesthetic

### 4. **Component Styling Patterns**

**Progress Bars:**
```
ProgressBar (12 chars filled/empty + label)
█████████░░░ 92.1%
```
- Color-coded: Green <60%, Yellow 60-80%, Red ≥80%
- Always show ~1 decimal place
- Estimate values prefixed with `~`

**Mascot Design:**
- **Large variant**: 3 lines, 8-12 chars wide
  ```
   ░▒▓▓▓▒░
  ▐▛ º º ▜▌▖
   ─‿─
  ```
- **Inline variant**: 3 lines, 12-14 chars (for compact header)
- **Small variant**: 2 lines, 5-6 chars

**Status Indicators:**
- Connected: `● Connected` (green dot)
- Disconnected: `○ Disconnected` (red dot)
- Focused session: `🟢` emoji
- Background sessions: `💤` emoji

**Menus:**
- Numbered buttons: `[1] 💾 Save Current Context`
- Selected: Cyan color, bold
- Disabled: Gray, dimmed
- Menu items use emoji icons

**Borders:**
- Top: `╭` + `─` repeats + `╮`
- Sides: `│` on each line
- Bottom: `╰` + `─` repeats + `╯`
- Borders always colored with accent (`#FF6600` or `#E67E52`)

### 5. **Design Philosophy**

**Core Principles:**
1. **Sparse and Zen-like**: Minimal visual noise, high information density
2. **Professional Terminal Aesthetic**: Inspired by vim/htop/git
3. **Accessibility**: High contrast text, semantic color coding
4. **Responsive**: Works from 60 chars (terminal width) upward
5. **Consistent Palette**: All UI elements use the coral accent system

**Visual Hierarchy:**
- Coral accent for all interactive/important elements
- Orange for borders and navigation
- Grayscale for supporting information
- Semantic colors (red/yellow/green) only for status states

### 6. **What Already Exists in Web GUI**

The web GUI (`gui/src/styles/theme/colors.ts`) already has most of this palette defined! The colors are nearly identical. However, the visual patterns need translation:

- Unicode block art patterns need CSS equivalents
- Progress bars with specific visual language
- Mascot ASCII art needs to become SVG/CSS
- Border styling using CSS
- Scene/background art as CSS or SVG
- Terminal-like layout patterns (fixed heights, scrollable containers)

### 7. **Key Implementation Notes for Web Port**

**Progress Bars:**
- Use same coral accent (`#E67E52`)
- Render filled/empty with smooth transitions
- Match terminal bar width proportions

**Mascot:**
- Convert ANSI art to SVG or CSS-drawn elements
- Maintain the philosophical character (white hair, coral face, expressive)
- Offer multiple sizes (large, inline, small)

**Scene/Background:**
- Render night sky with Unicode-equivalent visual style using CSS
- Block gradient effect could use CSS gradients or SVG patterns
- Keep sparse, professional aesthetic

**Borders:**
- CSS borders or div-based borders
- Maintain corner characters and rounded aesthetic

**Typography:**
- Already defined: JetBrains Mono (monospace), System UI (sans-serif)
- Maintain clear size hierarchy

---

**Files to Reference:**
- Terminal components: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/`
- Theme colors: `/Users/gole/Desktop/jacques-context-manager/gui/src/styles/theme/colors.ts`
- Mascot ANSI: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/assets/mascot-ansi.ts`
- Scene art: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ascii-art/scene.ts`
- Progress utilities: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ascii-art/progress.ts`

This design DNA captures the minimalist, professional terminal aesthetic with the distinctive coral accent, Unicode art patterns, and responsive layout principles that make the terminal dashboard unique and elegant.