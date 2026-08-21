# Kurage Design System — Visual Specification

> **Status note (20 August 2026):** this visual specification does not prove
> accessibility or complete implementation. The baseline and WCAG gaps are in the
> [factual audit](./08_current_state_audit.md).

[← Return to Master Node](./00_index.md)

---

## 🎨 Visual Philosophy

The **Kurage** visual system fuses **HLTV's high data density**, **Apple-modern typography and surface depth**, and the **operational calmness of Linear and Raycast**.

### 🚫 Strict Rules (Anti-AI Clichés)
- **Element Backgrounds & Borders:** Elements (text, icons, avatars) **must not** have backgrounds or borders without clear context and purpose. Keep designs clean and justified.
- **Zero Decorative Gradients:** No rainbow gradient text or glowing borders.
- **Zero Purple on Dark:** Violet/purple accents on dark backgrounds are strictly prohibited.
- **Solid, Purposeful Surfaces:** No icon-stuffed bento boxes or cards with 3+ nested levels.

---

## 🎨 Color Tokens

```css
/* Surface Elevation (Apple Depth Model) */
--canvas: #090B0C;             /* Viewport background */
--surface: #111516;            /* Cards and panels */
--surface-raised: #181D1C;     /* Popovers, modals, hover states */
--surface-overlay: #1E2423;    /* Tooltips and hovercards (highest elevation) */

/* Subtle Borders */
--border: #29302F;             /* Structural dividers (1px) */
--border-subtle: #1F2524;      /* Internal subtle separators */

/* Typography Contrast Hierarchy */
--text-primary: #EEEDE9;       /* Titles, high-emphasis text, buttons */
--text-secondary: #8D9694;     /* Subheadings, metadata, labels */
--text-tertiary: #5A6360;      /* Placeholders and disabled states */

/* Brand Identity (Sea Glass) */
--accent: #A9C8C0;             /* Bioluminescent calm accent */
--accent-muted: #7A9E94;       /* Action hover state */
--accent-subtle: #A9C8C020;    /* Muted background tint */

/* Semantic Colors */
--success: #8ABBA4;
--warning: #D0BD7B;
--error: #C55B61;
--info: #7BA4C7;

/* Leaderboard Podiums */
--gold: #D4A853;
--silver: #B0B8BF;
--bronze: #C2956B;
```

---

## 🔤 Typography

| Scale | Family | Size | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| **Display** | `Manrope` | 28–40px | 650 | -0.055em to -0.065em | Hero numbers, K/D, ELO |
| **Heading** | `Manrope` | 18–24px | 600 | -0.025em to -0.04em | Section headings |
| **Subheading** | `Inter` | 15px | 600 | -0.015em | Table headers, card titles |
| **Body** | `Inter` | 13px | 400–500 | 0 | Descriptions and paragraphs |
| **Small** | `Inter` | 12px | 400 | 0 | Inline metadata |
| **Label** | `Inter` | 10–11px | 600 | +0.08em to +0.12em | Eyebrows and uppercase tags |
| **Mono** | `JetBrains Mono` | 12–13px | 400 | 0 | Steam IDs, CS2 Server IPs |

- **Requirement:** `font-variant-numeric: tabular-nums` must be used on all numeric stats and leaderboard cells.
