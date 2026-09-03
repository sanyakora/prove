# CSS/JS override for the existing Webflow build

Restyles your current two-Collection-List tab component to match the reference design, and
adds the mobile accordion behaviour. **No structural changes needed in the Designer.**

| File | What it does |
| --- | --- |
| `webflow-override.css` | All styling, keyed to your existing class names |
| `webflow-override.js` | Tabs on desktop, accordion on mobile, keyboard + ARIA |

---

## Install (3 steps)

### 1. Delete the old inline code

In the page's **Before `</body>`** custom code, remove **both** the `<style>` block and the
`<script>` block currently there:

```css
.tab-pane { display: none; }              /* remove */
.tab-pane.is-active { display: grid; }    /* remove */
.tab-btn { cursor: pointer; ... }         /* remove */
.tab-btn.is-active { ... }                /* remove */
```

```js
document.addEventListener('DOMContentLoaded', function () {   /* remove */
  var btns  = document.querySelectorAll('.tab-btn');
  ...
```

The old script must go — two scripts toggling `is-active` on the same nodes fight each
other, and the old one has no height animation and no collapse-on-second-tap.

The override is written to survive the `<style>` block being left in by mistake (it restates
the three conflicting declarations one class higher), but removing it is cleaner. Those
conflicts, for the record:

- `.tab-btn.is-active { border-bottom: 3px solid }` drew a second underline on desktop and a
  stray purple line under the logo on mobile, and shifted the active logo up 3px.
- `.tab-btn { opacity: .5 }` compounded with the logo image opacity, rendering inactive
  logos at 0.25 and dimming the mobile chevron with them.
- `.tab-pane.is-active { display: grid }` overrode the mobile column layout.

### 2. Paste the CSS

**Page Settings → Inside `<head>` tag:**

```html
<style>
/* paste all of webflow-override.css */
</style>
```

### 3. Paste the JS

**Page Settings → Before `</body>` tag** (where the old script was):

```html
<script>
/* paste all of webflow-override.js */
</script>
```

Publish. Nothing in the Designer needs to move.

---

## How the mobile accordion works

Your logos and your panes are in **two separate Collection Lists**, in two different parts of
the DOM. An accordion needs them interleaved — logo, pane, logo, pane.

So below 992px the JS takes each `.tab-btn` out of `.tab-nav` and inserts it directly above
its own `.tab-pane`, inside that pane's `.w-dyn-item`:

```
BEFORE (desktop)                     AFTER (mobile)
.tab-nav                             .tab-nav          → display:none (now empty)
└── .w-dyn-item                      .tab-body
    └── .tab-btn      ─────┐         └── .w-dyn-item
.tab-body                  └──────────►  ├── .tab-btn     ← header, moved
└── .w-dyn-item                          └── .tab-pane    ← collapses
    └── .tab-pane
```

Each trigger's original parent is stored at init, so growing the viewport puts it back.
`.tab-nav` is hidden on mobile rather than removed, so nothing is destroyed.

The chevron is a CSS-only `::before` on `.tab-btn` — no element to add in the Designer.

---

## Class map

What the override targets, and what each thing became:

| Your class | Styled as |
| --- | --- |
| `.section-4` | Section + the scope prefix on every rule |
| `.tab-nav` → `.w-dyn-items` | Desktop logo strip (flex, bottom rule); hidden on mobile |
| `.tab-btn` | Logo trigger; grayscale 0.5 → full colour when active |
| `.tab-btn::after` | Purple active underline (desktop) |
| `.tab-btn::before` | Chevron (mobile only) |
| `.tab-body` → `.w-dyn-item` | Accordion row on mobile — hairline + purple active rule |
| `.tab-pane` | 2-column grid on desktop; collapsing column on mobile |
| `.content-left` | Column 1, row 1 |
| `.metrics-section` | Column 1, row 2 |
| `.content-right` | Column 2, spanning both rows; rounded, `object-fit: cover` |
| `.quote-container p` | Quote |
| `.author-container h4` / `p` | Name (purple) / role |
| `.metrics-grid` | 3-column stat grid; CTA gets its own full-width row |
| `.metric-item h3` / `p` | Stat value (purple) / label |
| `.button-main` | Black pill CTA |
| `.brand-logo-image` | Hidden — the trigger already shows the logo in both modes |

Two deliberate choices here:

- **Stat values and labels are targeted structurally** (`.metric-item h3`, `.metric-item p`)
  rather than by `.heading-2` / `.heading-3` / `.heading-4` and `.paragraph-3/-4/-5`. Those
  are auto-generated Webflow classes — three different ones for three identical-looking
  elements — and they get renamed or regenerated easily. Styling the structure means you can
  clean those classes up later without touching this file.
- **Every rule is prefixed with `.section-4`.** That prefix is what makes the override beat
  Webflow's own single-class styles regardless of which stylesheet loads first.

---

## Options and tokens

On the section, to pick which story opens first (zero-indexed):

```html
<section class="section-4" data-cs-initial="0">
```

Without it, the JS uses whichever `.tab-btn` carries `is-active` in the published markup, and
falls back to the first. Colours and metrics live in the token block at the top of the CSS:

```css
.section-4 {
  --cs-accent: #6e4ae6;   /* underline, purple rule, name, stat values */
  --cs-bg: #f7f5fe;
  --cs-text: #150a2e;
  --cs-muted: #2c2440;
  --cs-rule: #e2dcf5;
  --cs-max: 1360px;       /* container width */
  --cs-col-gap: 80px;     /* desktop column gap */
  --cs-radius: 20px;      /* image corner */
}
```

---

## Caveats

**The two lists are paired by index.** Both Collection Lists must be bound to the same
collection with the **same sort order, filter and limit** — logo #3 is matched to pane #3 by
position, which is what your original script did too. If the counts differ, the JS logs a
warning naming both counts and pairs as many as it can. A single Collection List carrying
both the trigger and the panel avoids this class of bug entirely; that is what
`../index.html` and `../README.md` in this repo describe, if you ever want to rebuild it that
way.

**Finsweet Attributes.** The page loads `attributes.js` with `fs-list`, and there are
`fs-list-element="list"` attributes on the `.w-dyn-items` in `.tab-body` **and** on each
`p.paragraph` (that second one looks accidental). Our JS handles the tabs, so if Finsweet
isn't doing anything else on this page, remove the script and those attributes — a Finsweet
list that re-renders or paginates the collection would replace the DOM nodes our JS moved,
which breaks the mobile accordion until reload. If you do need Finsweet here, tell me and
I'll re-init on its render event instead.

**I could not see your Webflow stylesheet** — only the exported HTML came through, not
`somtos-sandbox.webflow.shared.css`. So the override explicitly declares every property that
matters (display, margins, padding, font sizes, colours, widths) rather than assuming
anything about the current styles. If something still looks off after publishing, it is a
property I did not think to reset; send me a screenshot and I will add it.

**Breakpoint lives in two places.** `CS_BREAKPOINT` in the JS must match the `991px`/`992px`
media queries in the CSS. 992px is Webflow's own Desktop breakpoint.

**If you rename the section class**, find-and-replace `.section-4` in the CSS and `SCOPE` in
the JS.

---

## Accessibility

- Desktop: `tablist` / `tab` / `tabpanel` roles, `aria-selected`, roving tabindex, and
  Arrow / Home / End navigation.
- Mobile: `role="button"` with `aria-expanded`, panes as `role="region"` labelled by their
  trigger, Enter and Space both toggle (and Space no longer scrolls the page).
- Collapsed panes are `visibility: hidden`, so the "Read the Story" links inside closed rows
  are not reachable by Tab. The visibility transition is delayed by the collapse duration so
  the pane stays visible while animating shut.
- `.tab-btn` is a Div Block, so the JS gives it `tabindex` and key handling to make it a real
  button to assistive tech.
- Respects `prefers-reduced-motion`.

---

## Verified

Tested headless against your exported markup (with the original inline `<style>` left in
place, to confirm the override wins on specificity):

- Desktop: 4 logos in the strip, one pane visible, click and keyboard switching, correct
  two-column placement, no horizontal overflow, active/inactive logos on the same baseline.
- Mobile: triggers relocated above their own panes, `.tab-nav` collapsed, chevron rendered,
  single-open accordion, tap-to-close, closed rows exactly 0px tall, CTAs in closed rows not
  focusable, image ordered last.
- Resizing across 992px in both directions restores the correct mode, including when every
  accordion row was closed first.
- Attribution-to-stats spacing holds at the same offset across image aspect ratios from
  1:0.6 to 1:2.4.
