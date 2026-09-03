/* ==========================================================================
   Prove — Customer Story Switcher
   Vanilla JS, no dependencies. Safe to run more than once (Webflow Designer
   preview re-runs page code); each root is initialised only once.

   Desktop (>= 992px): triggers are relocated into .cs-tabbar and behave as
   an ARIA tablist. Mobile (< 992px): triggers stay inside their item and
   behave as accordion buttons.

   Breakpoint must match the media queries in prove-case-studies.css.
   ========================================================================== */

(function () {
  "use strict";

  var CS_BREAKPOINT = 992; // px — keep in sync with the CSS
  var uid = 0;

  /* ---------------------------------------------------------------- helpers */

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function isBlank(el) {
    if (!el) return true;
    // An <img> counts as filled only when it has a real src.
    if (el.tagName === "IMG") {
      var src = el.getAttribute("src");
      return !src || /^(#|about:blank)$/.test(src);
    }
    if (el.tagName === "A") {
      var href = el.getAttribute("href");
      if (!href || href === "#") return true;
    }
    return el.textContent.replace(/[\s\u00a0]/g, "") === "";
  }

  function hide(el) {
    if (el) el.classList.add("cs-hidden");
  }

  /* Empty Webflow CMS fields render as empty elements — collapse them so a
     story with two stats or no CTA still looks deliberate. */
  function pruneEmpty(item) {
    toArray(item.querySelectorAll(".cs-stat")).forEach(function (stat) {
      if (isBlank(stat.querySelector(".cs-stat-value"))) hide(stat);
    });

    var stats = item.querySelector(".cs-stats");
    if (stats && !stats.querySelector(".cs-stat:not(.cs-hidden)")) hide(stats);

    var cta = item.querySelector(".cs-cta");
    if (isBlank(cta)) hide(cta);

    var name = item.querySelector(".cs-name");
    if (isBlank(name)) hide(name);

    var role = item.querySelector(".cs-role");
    if (isBlank(role)) hide(role);

    var media = item.querySelector(".cs-media");
    if (media && isBlank(media.querySelector(".cs-image"))) {
      // Keep the block as a gradient placeholder rather than a broken image.
      media.classList.add("cs-is-empty");
    }
  }

  /* ------------------------------------------------------------- component */

  function Switcher(root) {
    this.root = root;
    this.tabbar = root.querySelector("[data-cs-tabbar], .cs-tabbar");
    this.list = root.querySelector("[data-cs-list], .cs-list");

    var itemNodes = root.querySelectorAll("[data-cs-item]");
    if (!itemNodes.length) {
      // Fall back to Webflow's own Collection Item class.
      itemNodes = root.querySelectorAll(".cs-item, .w-dyn-item");
    }

    var self = this;
    this.items = toArray(itemNodes)
      .map(function (node) {
        var trigger =
          node.querySelector("[data-cs-trigger]") || node.querySelector(".cs-trigger");
        var panel =
          node.querySelector("[data-cs-panel]") || node.querySelector(".cs-panel");
        if (!trigger || !panel) return null;
        return { node: node, trigger: trigger, panel: panel };
      })
      .filter(Boolean);

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

    var flagged = -1;
    this.items.forEach(function (item, i) {
      if (flagged === -1 && item.node.classList.contains("is-active")) flagged = i;
    });
    return flagged === -1 ? 0 : flagged;
  };

  Switcher.prototype.setup = function () {
    var self = this;

    this.items.forEach(function (item, i) {
      pruneEmpty(item.node);

      item.trigger.id = self.ns + "-trigger-" + i;
      item.panel.id = self.ns + "-panel-" + i;
      item.panel.setAttribute("aria-labelledby", item.trigger.id);

      // Works whether the trigger is a <button> or a Webflow Div/Link Block.
      if (item.trigger.tagName !== "BUTTON") {
        item.trigger.setAttribute("tabindex", "0");
      }
      if (item.trigger.tagName === "A") {
        item.trigger.addEventListener("click", function (e) {
          e.preventDefault();
        });
      }

      item.trigger.addEventListener("click", function () {
        self.onTriggerActivate(i);
      });

      item.trigger.addEventListener("keydown", function (e) {
        self.onKeydown(e, i);
      });

      item.panel.addEventListener("transitionend", function (e) {
        if (e.propertyName !== "max-height" || self.mode !== "mobile") return;
        // Release the pinned height so the panel can reflow (text wrap,
        // image load, orientation change) while it is open.
        if (item.node.classList.contains("is-active")) {
          item.panel.style.maxHeight = "none";
        }
      });
    });

    if (this.list) this.list.setAttribute("data-cs-ready", "true");

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
    var self = this;

    // A tab bar always has one tab selected, even if every accordion row was
    // closed before the viewport grew.
    if (this.active < 0) this.active = 0;

    if (this.tabbar) {
      this.tabbar.removeAttribute("aria-hidden");
      this.tabbar.setAttribute("role", "tablist");
      // Relocate in source order so the tab strip always matches CMS order.
      this.items.forEach(function (item) {
        self.tabbar.appendChild(item.trigger);
      });
    }

    this.items.forEach(function (item) {
      item.trigger.setAttribute("role", "tab");
      item.trigger.removeAttribute("aria-expanded");
      item.panel.setAttribute("role", "tabpanel");
      // Inline heights would beat the desktop media query.
      item.panel.style.maxHeight = "";
    });

    this.render(true);
  };

  Switcher.prototype.applyMobile = function () {
    var self = this;

    if (this.tabbar) {
      this.tabbar.setAttribute("aria-hidden", "true");
      this.tabbar.removeAttribute("role");
    }

    this.items.forEach(function (item) {
      // Put the trigger back at the top of its own item.
      if (item.trigger.parentNode !== item.node) {
        item.node.insertBefore(item.trigger, item.node.firstChild);
      }
      item.trigger.setAttribute("role", "button");
      item.trigger.removeAttribute("aria-selected");
      item.panel.setAttribute("role", "region");
      self.setHeight(item, item === self.items[self.active], true);
    });

    this.render(true);
  };

  /* -------------------------------------------------------------- activate */

  Switcher.prototype.onTriggerActivate = function (index) {
    // On mobile the open item collapses when tapped again.
    if (this.mode === "mobile" && index === this.active) {
      this.active = -1;
    } else {
      this.active = index;
    }
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

      item.node.classList.toggle("is-active", on);
      item.trigger.classList.toggle("is-active", on);

      if (self.mode === "desktop") {
        item.trigger.setAttribute("aria-selected", on ? "true" : "false");
        item.trigger.setAttribute("tabindex", on ? "0" : "-1");
        item.panel.hidden = !on;
      } else {
        item.trigger.setAttribute("aria-expanded", on ? "true" : "false");
        item.trigger.setAttribute("tabindex", "0");
        item.panel.hidden = false;
        self.setHeight(item, on, immediate);
      }
    });
  };

  Switcher.prototype.setHeight = function (item, open, immediate) {
    var panel = item.panel;

    if (!open) {
      if (immediate || panel.style.maxHeight === "0px") {
        panel.style.maxHeight = "0px";
        return;
      }
      // Animating from `none` doesn't work — pin the measured height first.
      panel.style.maxHeight = panel.scrollHeight + "px";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          panel.style.maxHeight = "0px";
        });
      });
      return;
    }

    if (immediate) {
      panel.style.maxHeight = "none";
      return;
    }
    panel.style.maxHeight = panel.scrollHeight + "px";
  };

  /* -------------------------------------------------------------- keyboard */

  Switcher.prototype.onKeydown = function (e, index) {
    var key = e.key;

    if (this.mode === "mobile") {
      // Div/Link triggers don't fire click on Space or Enter by themselves.
      if (this.items[index].trigger.tagName !== "BUTTON" && (key === "Enter" || key === " ")) {
        e.preventDefault();
        this.onTriggerActivate(index);
      }
      return;
    }

    var last = this.items.length - 1;
    var next = null;

    if (key === "ArrowRight" || key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (key === "ArrowLeft" || key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (key === "Home") next = 0;
    else if (key === "End") next = last;
    else if (this.items[index].trigger.tagName !== "BUTTON" && (key === "Enter" || key === " ")) {
      e.preventDefault();
      this.onTriggerActivate(index);
      return;
    }

    if (next === null) return;
    e.preventDefault();
    this.select(next);
    this.items[next].trigger.focus();
  };

  /* ------------------------------------------------------------------ boot */

  function init(scope) {
    var context = scope || document;
    var roots = toArray(context.querySelectorAll("[data-cs], .cs"));
    var made = [];

    roots.forEach(function (root) {
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

  window.ProveCaseStudies = { init: init, breakpoint: CS_BREAKPOINT };
})();
