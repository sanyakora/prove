/* ==========================================================================
   Prove — Customer Story Switcher
   BEHAVIOUR OVERRIDE for the existing Webflow build (two Collection Lists).

   Replaces the original inline tab script. Delete that <script> (and its
   <style>) before adding this one — two scripts toggling `is-active` on the
   same nodes will fight each other.

   Desktop (>= 992px): .tab-nav is an ARIA tablist, one .tab-pane visible.
   Mobile  (< 992px):  each .tab-btn is moved out of .tab-nav and inserted
                       directly above its own .tab-pane, turning the second
                       Collection List into a single-open accordion. Moving
                       back up on resize restores the original parent.

   The two Collection Lists are paired BY INDEX (as the original script did),
   so both must be bound to the same collection with the same sort, filter
   and limit. A mismatch is reported in the console.

   SCOPE / CS_BREAKPOINT below must match webflow-override.css.
   ========================================================================== */

(function () {
  "use strict";

  var SCOPE = ".section-4"; // the section wrapping both lists
  var CS_BREAKPOINT = 992; // px — keep in sync with the CSS

  var SEL = {
    nav: ".tab-nav", // wrapper of Collection List #1 (logos)
    body: ".tab-body", // wrapper of Collection List #2 (panes)
    items: ".w-dyn-items", // Webflow's Collection List
    item: ".w-dyn-item", // Webflow's Collection Item
    trigger: ".tab-btn", // logo trigger
    pane: ".tab-pane" // story panel
  };

  var ACTIVE = "is-active";
  var uid = 0;

  /* ---------------------------------------------------------------- helpers */

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  /* ------------------------------------------------------------- component */

  function Switcher(root) {
    this.root = root;
    this.nav = root.querySelector(SEL.nav);
    this.body = root.querySelector(SEL.body);
    if (!this.body) return;

    this.paneList = this.body.querySelector(SEL.items);

    var triggers = this.nav ? toArray(this.nav.querySelectorAll(SEL.trigger)) : [];
    var panes = toArray(this.body.querySelectorAll(SEL.pane));

    if (triggers.length !== panes.length) {
      console.warn(
        "[story switcher] " +
          triggers.length +
          " logos vs " +
          panes.length +
          " panes. Both Collection Lists must use the same collection, sort, " +
          "filter and limit — the extras are ignored."
      );
    }

    var count = Math.min(triggers.length, panes.length);
    this.items = [];

    for (var i = 0; i < count; i++) {
      var pane = panes[i];
      this.items.push({
        trigger: triggers[i],
        // Where the trigger goes back to when the viewport grows.
        home: triggers[i].parentNode,
        pane: pane,
        // The collection item wrapping the pane — the accordion row, and the
        // insertion point for the trigger on mobile.
        row: pane.closest(SEL.item) || pane.parentNode
      });
    }

    if (!this.items.length) return;

    uid += 1;
    this.ns = "cs-" + uid;
    this.mode = null;
    this.active = this.initialIndex();

    this.mq = window.matchMedia("(min-width: " + CS_BREAKPOINT + "px)");
    this.onMediaChange = this.syncMode.bind(this);

    this.setup();
  }

  Switcher.prototype.initialIndex = function () {
    var attr = parseInt(this.root.getAttribute("data-cs-initial"), 10);
    if (!isNaN(attr) && attr >= 0 && attr < this.items.length) return attr;

    // Otherwise honour whichever item the Designer left marked active.
    var flagged = -1;
    this.items.forEach(function (item, i) {
      if (flagged === -1 && item.trigger.classList.contains(ACTIVE)) flagged = i;
    });
    return flagged === -1 ? 0 : flagged;
  };

  Switcher.prototype.setup = function () {
    var self = this;

    this.items.forEach(function (item, i) {
      item.trigger.id = self.ns + "-trigger-" + i;
      item.pane.id = self.ns + "-pane-" + i;
      item.pane.setAttribute("aria-labelledby", item.trigger.id);

      // .tab-btn is a Webflow Div Block, so it needs to be made operable.
      item.trigger.setAttribute("tabindex", "0");

      item.trigger.addEventListener("click", function () {
        self.onActivate(i);
      });

      item.trigger.addEventListener("keydown", function (e) {
        self.onKeydown(e, i);
      });

      item.pane.addEventListener("transitionend", function (e) {
        if (e.propertyName !== "max-height" || self.mode !== "mobile") return;
        // Release the pinned height so an open pane can still reflow when
        // text rewraps, an image loads, or the device rotates.
        if (item.row.classList.contains(ACTIVE)) {
          item.pane.style.maxHeight = "none";
        }
      });
    });

    // Switches off the pre-init "first story open" fallback in the CSS.
    if (this.paneList) this.paneList.setAttribute("data-cs-ready", "true");

    this.syncMode();

    if (this.mq.addEventListener) {
      this.mq.addEventListener("change", this.onMediaChange);
    } else if (this.mq.addListener) {
      this.mq.addListener(this.onMediaChange); // Safari < 14
    }

    this.root.setAttribute("data-cs-initialized", "true");
  };

  /* ------------------------------------------------------------ mode swap */

  Switcher.prototype.syncMode = function () {
    var next = this.mq.matches ? "desktop" : "mobile";
    if (next === this.mode) return;
    this.mode = next;
    next === "desktop" ? this.applyDesktop() : this.applyMobile();
  };

  Switcher.prototype.applyDesktop = function () {
    // A tab strip always has one tab selected, even if every accordion row
    // was closed before the viewport grew.
    if (this.active < 0) this.active = 0;

    var navList = this.nav ? this.nav.querySelector(SEL.items) : null;
    if (navList) navList.setAttribute("role", "tablist");

    this.items.forEach(function (item) {
      // Back into its own collection item in .tab-nav.
      if (item.trigger.parentNode !== item.home) {
        item.home.appendChild(item.trigger);
      }
      item.trigger.setAttribute("role", "tab");
      item.trigger.removeAttribute("aria-expanded");
      item.pane.setAttribute("role", "tabpanel");
      // An inline max-height would outrank the desktop media query.
      item.pane.style.maxHeight = "";
    });

    this.render(true);
  };

  Switcher.prototype.applyMobile = function () {
    var self = this;

    var navList = this.nav ? this.nav.querySelector(SEL.items) : null;
    if (navList) navList.removeAttribute("role");

    this.items.forEach(function (item) {
      // Straight above its own pane, inside the pane's collection item.
      if (item.trigger.parentNode !== item.row) {
        item.row.insertBefore(item.trigger, item.pane);
      }
      item.trigger.setAttribute("role", "button");
      item.trigger.removeAttribute("aria-selected");
      item.pane.setAttribute("role", "region");
      self.setHeight(item, item === self.items[self.active], true);
    });

    this.render(true);
  };

  /* -------------------------------------------------------------- activate */

  Switcher.prototype.onActivate = function (index) {
    // On mobile, tapping the open row closes it.
    this.active = this.mode === "mobile" && index === this.active ? -1 : index;
    this.render(false);
  };

  Switcher.prototype.select = function (index) {
    if (index < 0 || index >= this.items.length) return;
    this.active = index;
    this.render(false);
  };

  Switcher.prototype.render = function (immediate) {
    var self = this;

    this.items.forEach(function (item, i) {
      var on = i === self.active;

      item.trigger.classList.toggle(ACTIVE, on);
      item.pane.classList.toggle(ACTIVE, on);
      item.row.classList.toggle(ACTIVE, on);

      if (self.mode === "desktop") {
        item.trigger.setAttribute("aria-selected", on ? "true" : "false");
        item.trigger.setAttribute("tabindex", on ? "0" : "-1");
      } else {
        item.trigger.setAttribute("aria-expanded", on ? "true" : "false");
        item.trigger.setAttribute("tabindex", "0");
        self.setHeight(item, on, immediate);
      }
    });
  };

  Switcher.prototype.setHeight = function (item, open, immediate) {
    var pane = item.pane;

    if (!open) {
      if (immediate || pane.style.maxHeight === "0px") {
        pane.style.maxHeight = "0px";
        return;
      }
      // A transition out of `none` does nothing — pin the measured height,
      // let it land, then collapse.
      pane.style.maxHeight = pane.scrollHeight + "px";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          pane.style.maxHeight = "0px";
        });
      });
      return;
    }

    if (immediate) {
      pane.style.maxHeight = "none";
      return;
    }
    pane.style.maxHeight = pane.scrollHeight + "px";
  };

  /* -------------------------------------------------------------- keyboard */

  Switcher.prototype.onKeydown = function (e, index) {
    var key = e.key;

    if (this.mode === "mobile") {
      if (key === "Enter" || key === " ") {
        e.preventDefault(); // Space would otherwise scroll the page
        this.onActivate(index);
      }
      return;
    }

    var last = this.items.length - 1;
    var next = null;

    if (key === "ArrowRight" || key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (key === "ArrowLeft" || key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (key === "Home") next = 0;
    else if (key === "End") next = last;
    else if (key === "Enter" || key === " ") {
      e.preventDefault();
      this.onActivate(index);
      return;
    }

    if (next === null) return;
    e.preventDefault();
    this.select(next);
    this.items[next].trigger.focus();
  };

  /* ------------------------------------------------------------------ boot */

  function init(scope) {
    var made = [];
    toArray((scope || document).querySelectorAll(SCOPE)).forEach(function (root) {
      if (root.getAttribute("data-cs-initialized") === "true") return;
      made.push(new Switcher(root));
    });
    return made;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }

  window.ProveCaseStudies = { init: init, breakpoint: CS_BREAKPOINT, scope: SCOPE };
})();
