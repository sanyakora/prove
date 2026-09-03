# Prove — Customer Story Switcher

A customer-story section that is a **logo tab bar** on desktop and a **logo accordion** on
mobile, driven by a single Webflow CMS Collection List.

| File | What it is |
| --- | --- |
| `index.html` | Standalone demo + the exact markup to reproduce in Webflow |
| `prove-case-studies.css` | All styles (no framework, no Webflow-class dependencies) |
| `prove-case-studies.js` | Behaviour: tabs, accordion, keyboard, empty-field handling |
| `images/*.svg` | Grey-box placeholders for the demo only — not needed in Webflow |

Open `index.html` in a browser and drag the window across 992px to see both modes.

---

## How it works (read this before building in Webflow)

A Webflow Collection List can only output **one** repeating structure, so each collection
item contains **both** its logo trigger and its story panel:

```
.cs-item                 ← Collection Item
├── .cs-trigger          ← logo + chevron
└── .cs-panel            ← quote, name, stats, CTA, image
```

On mobile that is exactly what you want: logo, then the content beneath it.

Above 992px the JS **moves every `.cs-trigger` into the empty `.cs-tabbar`** above the list,
in collection order, and shows only the active panel. Below 992px it moves them back. One
Collection List, one source of truth, both layouts — no duplicated bindings, no index
matching.

---

## 1. CMS Collection

Create a collection (e.g. **Customer Stories**) with these fields:

| Field name | Type | Bound to |
| --- | --- | --- |
| `Logo` | Image | `.cs-logo` |
| `Quote` | Plain text (long) | `.cs-quote` |
| `Person Name` | Plain text | `.cs-name` |
| `Person Title` | Plain text | `.cs-role` |
| `Stat 1 Value` | Plain text | `.cs-stat-value` (1st) |
| `Stat 1 Label` | Plain text | `.cs-stat-label` (1st) |
| `Stat 2 Value` | Plain text | `.cs-stat-value` (2nd) |
| `Stat 2 Label` | Plain text | `.cs-stat-label` (2nd) |
| `Stat 3 Value` | Plain text | `.cs-stat-value` (3rd) |
| `Stat 3 Label` | Plain text | `.cs-stat-label` (3rd) |
| `Story Link` | Link **or** Reference to the story page | `.cs-cta` href |
| `Story Image` | Image | `.cs-image` |
| `CTA Label` *(optional)* | Plain text | `.cs-cta` text — otherwise hard-code "Read the Story" |

Stat values are **plain text, not numbers** — the design needs `90%`, `3x` and `0`.

Leave any stat pair, the name, the role or the link empty and the JS collapses just that
piece, so a story with two stats still looks deliberate. An empty image field falls back to
the gradient block instead of a broken image.

---

## 2. Paste the code

**Project Settings → Custom Code**, or Page Settings for a single page:

*Inside `<head>`:*

```html
<style>
/* paste the whole of prove-case-studies.css here */
</style>
```

*Before `</body>`:*

```html
<script>
/* paste the whole of prove-case-studies.js here */
</script>
```

Prefer Page Settings if the section only appears on one page. Do **not** put the CSS/JS in
an HTML Embed inside the Collection List — an embed inside a collection item is duplicated
once per item, and embeds cap at 50,000 characters.

---

## 3. Build the structure

Add these elements in the Navigator and give them the classes below. Custom attributes
(the `data-cs-*` ones) are set in the **Settings panel → Custom attributes**.

```
Section                class: cs                attr: data-cs = "" (name only, empty value)
└── Div                class: cs-container
    ├── Div            class: cs-tabbar         attr: data-cs-tabbar = ""      ← LEAVE EMPTY
    └── Collection List Wrapper
        └── Collection List   class: cs-list    attr: data-cs-list = ""
            └── Collection Item  class: cs-item attr: data-cs-item = ""
                ├── Div      class: cs-trigger  attr: data-cs-trigger = ""
                │   ├── Div  class: cs-logo-wrap
                │   │   └── Image  class: cs-logo        → bind to Logo
                │   └── Embed class: cs-chevron          → chevron SVG (below)
                └── Div      class: cs-panel    attr: data-cs-panel = ""
                    └── Div  class: cs-panel-inner
                        ├── Div class: cs-content
                        │   ├── Block Quote class: cs-quote      → bind to Quote
                        │   ├── Div  class: cs-name              → bind to Person Name
                        │   ├── Div  class: cs-role              → bind to Person Title
                        │   ├── Div  class: cs-stats
                        │   │   ├── Div class: cs-stat
                        │   │   │   ├── Div class: cs-stat-value → bind to Stat 1 Value
                        │   │   │   └── Div class: cs-stat-label → bind to Stat 1 Label
                        │   │   ├── Div class: cs-stat           → Stat 2 (duplicate)
                        │   │   └── Div class: cs-stat           → Stat 3 (duplicate)
                        │   └── Link Block class: cs-cta         → link to Story Link
                        │       ├── Text  "Read the Story"
                        │       └── Embed class: cs-cta-arrow    → arrow SVG (below)
                        └── Div class: cs-media
                            └── Image class: cs-image            → bind to Story Image
```

Notes on the Webflow specifics:

- **`.cs-tabbar` must stay empty.** It is the destination the JS moves triggers into. It is
  `display: none` below 992px, so it costs nothing on mobile.
- **`.cs-trigger` is a plain Div Block**, not a Link Block — a link would navigate on click.
  The JS gives it `role`, `tabindex`, `aria-selected`/`aria-expanded` and Enter/Space
  handling, so it is a real button to a screen reader and to the keyboard.
- **`.cs-stats` / `.cs-stat`** can be Divs; the demo uses `ul`/`li` because Webflow's List
  element works too if you prefer semantics.
- The CSS sets no `font-family`, so the section inherits your site's body font.

SVGs for the two Embeds:

```html
<!-- .cs-chevron -->
<svg class="cs-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M6 9.5 12 15.5 18 9.5" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>

<!-- .cs-cta-arrow -->
<svg class="cs-cta-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

(Put the class on the `svg` itself as shown — then the Embed wrapper needs no class.)

---

## 4. Options

On the `.cs` section:

| Attribute | Default | Effect |
| --- | --- | --- |
| `data-cs-initial` | `0` | Which story opens first, zero-indexed |

Theme tokens live at the top of the CSS on `.cs` — override them there or in a later
stylesheet:

```css
.cs {
  --cs-accent: #7b4ee8;      /* underline, purple rule, name, stat values */
  --cs-bg: #f7f5fe;          /* section background */
  --cs-text: #150a2e;        /* quote */
  --cs-muted: #2c2440;       /* role, stat labels */
  --cs-rule: #e2dcf5;        /* hairlines */
  --cs-cta-bg: #000;         /* pill button */
  --cs-cta-text: #fff;
  --cs-max: 1360px;          /* container width */
  --cs-col-gap: 80px;        /* desktop column gap */
  --cs-radius: 20px;         /* image corner */
}
```

Inactive logos are rendered `grayscale(1)` at 50% opacity and go full colour when active.
To keep them always in colour, drop the `filter`/`opacity` from `.cs-logo`.

---

## 5. Gotchas

- **Breakpoint is in two places.** `CS_BREAKPOINT = 992` in the JS must match the
  `991px`/`992px` media queries in the CSS. 992px is Webflow's own Desktop breakpoint.
- **Logo assets should be tightly cropped.** They are sized by height (`30px` desktop,
  `26px` mobile) with `width: auto`, so whitespace baked into an SVG/PNG shows up as
  misalignment in the tab bar. Export with the artboard trimmed to the wordmark.
- **Designer preview.** The JS is idempotent — it stamps `data-cs-initialized` on the
  section and skips anything already set up, so Webflow re-running page code will not
  double-bind. If you need to re-init after injecting markup yourself, call
  `window.ProveCaseStudies.init()`.
- **Empty Collection List.** With no published items the section renders as an empty
  container; add a Webflow "Empty State" if that is possible on your page.
- **Reduced motion** is respected — transitions collapse for users who ask for it.

---

## Accessibility

- Desktop: real `tablist` / `tab` / `tabpanel` roles with `aria-selected`, roving tabindex,
  and Arrow / Home / End key navigation.
- Mobile: `role="button"` with `aria-expanded`, panels as `role="region"` labelled by their
  trigger, Enter and Space both activate.
- Focus is visible on triggers and the CTA, and the CTA is a real link so it opens in a new
  tab with a modifier key.
