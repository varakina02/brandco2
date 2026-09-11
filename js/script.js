/* ============================================================================
   Brandco — Interactions & animations
   GSAP + ScrollTrigger (loaded via CDN in index.html).
   All tunable animation values live in the ANIM config below.
   ============================================================================ */

(function () {
  "use strict";

  /* ---- Animation config (tweak everything here) ------------------------- */
  var ANIM = {
    DURATION: 0.6,          // base reveal duration (s) — within the 0.4–0.8 range
    // The hero wordmark's entrance on load: each word slides up out of its own
    // clipped slot (a masked line rise), BRANDCO then STUDIO. It is the first
    // thing on the page and the biggest type on it. DELIBERATELY above the
    // 0.4–0.8 range every other reveal follows — a slow, unhurried arrival was
    // asked for here, and this is the one element on the page that can carry it.
    HERO_DURATION: 1.2,
    HERO_STAGGER: 0.15,     // second line follows the first (s)
    // How far below its slot's edge a word starts, as % of its own height. 100
    // is exactly one line-height — fully hidden — with a little extra so the
    // rim stroke on the cap tops is under the edge too.
    HERO_START_OFFSET: 110,
    // Reveal duration for the short Services rows. A 113px row is a fraction of
    // a 850px case card, so the shared 0.6s reads noticeably quicker on it —
    // this is the calmer end of the same 0.4–0.8 range, to match by FEEL rather
    // than by number.
    ROW_DURATION: 0.8,
    STAGGER: 0.12,          // delay between staggered reveals (s)
    // ScrollTrigger.batch grouping window (s). Tight on purpose: only items
    // that cross the reveal line in the same instant — a row of cards — should
    // share a batch and be staggered. Items merely CLOSE together vertically
    // must each fire on arrival, or the stagger queues them behind one another
    // and they land visibly late (see initServices).
    BATCH_INTERVAL: 0.02,
    EASE: "power2.out",     // soft easing (not linear)
    Y_OFFSET: 40,           // fallback translateY for reveals (px)
    // NOTE: every reveal — the hero, the scroll reveals, the stat blocks, the
    // accordion rows, the case cards and the team cards — takes its travel from
    // --reveal-y in variables.css instead (see revealY()), so the mobile @media
    // block can shorten it in one place. Y_OFFSET is only the fallback.
    REVEAL_Y_VAR: "--reveal-y",
    REVEAL_START: "top 85%", // ScrollTrigger position for scroll-in reveals
    // Reveal position for short rows inside a bordered list (Services). The
    // list draws its own closing border-bottom, which never hides, so a row
    // that is on screen but not yet revealed reads as a framed EMPTY SLOT — as
    // if a service were missing. A 113px row sits in that state for ~123px of
    // scrolling under "top 85%", so these fire the moment they enter view.
    ROW_REVEAL_START: "top bottom",
    // Stats: staggered block reveal + rolling-odometer digits
    STAT_START: "top 85%",   // ScrollTrigger position for the stats grid
    STAT_STAGGER: 0.18,      // delay between successive stat blocks (s)
    // Odometer spring (mass = 1) — matches the reference useSpring config.
    SPRING_STIFFNESS: 300,
    SPRING_DAMPING: 30,
    // Services accordion: the panel height tween, then the copy fading in behind it
    PANEL_DURATION: 0.4,     // height open/close (s)
    PANEL_FADE: 0.3,         // desc + tags fade (s)
    PANEL_FADE_DELAY: 0.12,  // fade starts slightly after the height (s)
    PANEL_FADE_Y: 10,        // starting translateY for the panel copy (px)
    // NOTE: the per-service image is NOT animated here. It reveals off the
    // .is-open class in CSS (.services__thumb), delayed by --delay-thumb so it
    // lands after this panel tween finishes — retime the two together.
    // Cases: the grid regroup after a category filter click
    FILTER_DURATION: 0.5,    // cards sliding to their new slots (s)
    FILTER_FADE: 0.3,        // cards dropping out / coming back (s)
    FILTER_SCALE: 0.94,      // scale they fade out to / in from
    // The grid's height tweens with the cards, which slides every section after
    // Cases. ScrollTrigger is re-measured every this-many px of that travel so
    // the reveals below keep firing where they should; small enough to be
    // invisible, large enough not to re-measure on every single frame.
    FILTER_REMEASURE: 40,    // px of grid height per ScrollTrigger re-measure
    // Where the filter row parks when a regroup has to pull the reader back up
    // to it. Read from CSS (see casesPinOffset) so the header height and this
    // offset stay in one place; the number here is only the fallback.
    FILTER_PIN_VAR: "--cases-pin-offset",
    FILTER_PIN_OFFSET: 120,  // px below the viewport top
    SCROLL_THRESHOLD: 40,    // px scrolled before the header darkens
    // Footer form: how long the "thanks" line stays before it clears itself (s)
    FORM_SUCCESS_HOLD: 3,
    // Reviews: stacked-card carousel.
    // NOTE: the reviews motion is driven by CSS transitions, not GSAP — these
    // are the PHASE TIMERS that sequence the class swaps, and they must match
    // the matching --review-*-duration tokens in variables.css.
    REVIEW_SWIPE: 50,               // px of drag before it counts as a swipe
    REVIEW_LIFT_DURATION: 0.35,     // back card pulled up out from behind (s)
    REVIEW_SETTLE_DURATION: 0.55,   // …then coming down onto the front slot (s)
    REVIEW_DEAL_DURATION: 0.8,      // scroll-in deal, one card (s)
    REVIEW_DEAL_STAGGER: 0.15,      // gap between dealt cards (s)
    // Footer starfield (see initFooterStars). Not GSAP — a particle field is a
    // raw rAF job, like the odometer springs above.
    STAR_COUNT: 130,                // stars generated across the band
    STAR_DEPTHS: [0.35, 0.65, 1],   // depth layers; scales drift AND parallax
    STAR_DRIFT: 7,                  // px/s at the nearest layer
    STAR_PARALLAX_X: 18,            // max px the field slides against the cursor
    STAR_PARALLAX_Y: 10,            // …and vertically, kept smaller
    STAR_FOLLOW: 3.5,               // parallax smoothing rate (1/s) — weighted, not twitchy
    STAR_DPR_MAX: 2                 // cap the backing store on hi-DPI screens
  };

  var header = document.querySelector("[data-header]");
  // [data-animate] → revealed once on load (hero). [data-reveal] → revealed when
  // scrolled into view (About and later sections).
  var animated = Array.prototype.slice.call(document.querySelectorAll("[data-animate]"));
  // The hero wordmark's words — each slides up out of its parent .hero__line
  // slot on load (initHeroReveal), separately from the plain [data-animate] fade.
  var heroWords = Array.prototype.slice.call(document.querySelectorAll("[data-hero-word]"));
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var statValues = Array.prototype.slice.call(document.querySelectorAll(".stat__value"));
  var statCounters = []; // rolling-odometer controllers, one per .stat__value

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var gsapReady = typeof window.gsap !== "undefined";
  if (gsapReady && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    /* Belt and braces: ScrollTrigger measures the page by jumping the scroller
       to 0, reading every trigger, then jumping back. A CSS scroll-behavior of
       "smooth" turns both of those writes into animations, so it reads the
       document while the page has not actually moved and every start/end comes
       out short by the current scrollY. The stylesheet no longer sets it (see
       initSmoothAnchors), and this makes sure re-adding it cannot silently
       break scroll triggers again — an explicit behavior passed to scrollTo
       still wins, so the nav's glide is unaffected. */
    document.documentElement.style.scrollBehavior = "auto";
  }
  // Flip is optional — it only smooths the Cases filter regroup (see initCases).
  if (gsapReady && window.Flip) {
    window.gsap.registerPlugin(window.Flip);
  }

  /* ==========================================================================
     Rolling odometer counter — pure-JS port of the Vue Bits "Counter".
     Each digit place is a column of 0–9 stacked in a 1em window; a spring per
     column rolls the right digit to the centre, the neighbours clipped. Offsets
     are in % of the digit height, so the whole thing scales with the fluid vw
     font-size. Faithful to the reference: per-column floor(value/place) targets,
     the same shortest-path Y offset (with the >5 wrap), spring stiff/damping.
     Integers only (our stats have no decimals).
     ========================================================================== */

  // value / place → integer digit-stack target for a column (from the reference).
  function valueRoundedToPlace(value, place) {
    var v = value / place;
    var nearest = Math.round(v);
    if (Math.abs(v - nearest) < 1e-9 * Math.max(1, Math.abs(v))) v = nearest;
    return Math.floor(v);
  }

  // Digits of `value` as place magnitudes: 120 → [100, 10, 1].
  function derivePlaces(value) {
    var s = String(Math.max(0, Math.floor(value)));
    return s.split("").map(function (ch, i) {
      return Math.pow(10, s.length - i - 1);
    });
  }

  // Position a column's 10 digits for its current (possibly fractional) value.
  function renderColumn(col) {
    var placeValue = col.x % 10;
    for (var i = 0; i < 10; i++) {
      var offset = (10 + i - placeValue) % 10;
      if (offset > 5) offset -= 10;          // shortest path (roll the near way)
      col.digits[i].style.transform = "translateY(" + offset * 100 + "%)";
    }
  }

  /* ---- One shared spring loop drives every active column ------------------ */
  var springCols = [];
  var springRAF = null;
  var springLast = 0;

  function stepSprings(now) {
    var dt = springLast ? Math.min((now - springLast) / 1000, 0.032) : 0.016;
    springLast = now;
    var active = false;
    for (var s = 0; s < springCols.length; s++) {
      var col = springCols[s];
      if (col.done) continue;
      // Semi-implicit Euler, mass = 1.
      var a = -ANIM.SPRING_STIFFNESS * (col.x - col.target) - ANIM.SPRING_DAMPING * col.v;
      col.v += a * dt;
      col.x += col.v * dt;
      if (Math.abs(col.x - col.target) < 5e-4 && Math.abs(col.v) < 5e-4) {
        col.x = col.target;
        col.v = 0;
        col.done = true;
      } else {
        active = true;
      }
      renderColumn(col);
    }
    if (active) {
      springRAF = window.requestAnimationFrame(stepSprings);
    } else {
      springRAF = null;
      springLast = 0;
      springCols = springCols.filter(function (c) { return !c.done; });
    }
  }

  function ensureSpringLoop() {
    if (!springRAF) {
      springLast = 0;
      springRAF = window.requestAnimationFrame(stepSprings);
    }
  }

  /* ---- Build a counter inside a mount element ---------------------------- */
  function createRollingCounter(mountEl, target) {
    var rc = document.createElement("span");
    rc.className = "rc";
    var columns = derivePlaces(target).map(function (place) {
      var colEl = document.createElement("span");
      colEl.className = "rc__col";
      var digits = [];
      for (var i = 0; i < 10; i++) {
        var d = document.createElement("span");
        d.className = "rc__digit";
        d.textContent = i;
        colEl.appendChild(d);
        digits.push(d);
      }
      rc.appendChild(colEl);
      return { place: place, digits: digits, x: 0, v: 0, target: 0, done: true };
    });
    mountEl.appendChild(rc);

    function paint() { columns.forEach(renderColumn); }

    return {
      // Show the target instantly (reduced motion / no animation).
      setInstant: function () {
        columns.forEach(function (c) {
          c.target = valueRoundedToPlace(target, c.place);
          c.x = c.target; c.v = 0; c.done = true;
        });
        paint();
      },
      // Paint the initial 0 state (pre-roll).
      reset: function () {
        columns.forEach(function (c) { c.x = 0; c.v = 0; c.target = 0; c.done = true; });
        paint();
      },
      // Roll from the current value to the target with the spring.
      start: function () {
        columns.forEach(function (c) {
          c.target = valueRoundedToPlace(target, c.place);
          c.done = false;
          if (springCols.indexOf(c) === -1) springCols.push(c);
        });
        ensureSpringLoop();
      }
    };
  }

  // Turn a .stat__value ("120+") into [prefix][rolling counter][suffix].
  function buildStatCounter(valueEl) {
    var prefix = valueEl.getAttribute("data-prefix") || "";
    var suffix = valueEl.getAttribute("data-suffix") || "";
    var target = parseInt(valueEl.getAttribute("data-target"), 10) || 0;
    valueEl.textContent = "";
    if (prefix) valueEl.appendChild(document.createTextNode(prefix));
    var ctrl = createRollingCounter(valueEl, target);
    if (suffix) valueEl.appendChild(document.createTextNode(suffix));
    return ctrl;
  }

  /* ---- Helpers ---------------------------------------------------------- */

  // Show everything in its final state, no motion (reduced-motion / no GSAP).
  function showEverythingStatic() {
    var statBlocks = Array.prototype.slice.call(
      document.querySelectorAll("[data-stats] .stat")
    );
    var serviceRows = Array.prototype.slice.call(
      document.querySelectorAll("[data-accordion] .services__item")
    );
    var caseCards = Array.prototype.slice.call(
      document.querySelectorAll("[data-cases-grid] .cases__card")
    );
    var teamCards = Array.prototype.slice.call(
      document.querySelectorAll("[data-team-grid] .team__card")
    );
    var reviewCards = Array.prototype.slice.call(
      document.querySelectorAll("[data-reviews] .reviews__card")
    );
    // Review cards get opacity ONLY — their fan transforms are the layout itself
    // (set by initReviews → render), so a blanket transform:none would flatten it.
    reviewCards.forEach(function (el) { el.style.opacity = "1"; });

    animated.concat(heroWords, revealTargets, statBlocks, serviceRows, caseCards, teamCards).forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    statCounters.forEach(function (c) { c.setInstant(); });
  }

  /* ---- Sticky header darken (works with or without GSAP) ---------------- */
  function initStickyHeader() {
    if (!header) return;

    if (gsapReady && window.ScrollTrigger) {
      window.ScrollTrigger.create({
        start: "top -" + ANIM.SCROLL_THRESHOLD,
        onUpdate: function (self) {
          header.classList.toggle("is-scrolled", self.scroll() > ANIM.SCROLL_THRESHOLD);
        },
        onToggle: function (self) {
          header.classList.toggle("is-scrolled", self.isActive);
        }
      });
    } else {
      var onScroll = function () {
        header.classList.toggle(
          "is-scrolled",
          window.scrollY > ANIM.SCROLL_THRESHOLD
        );
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---- Reveal travel ------------------------------------------------------
     How far a reveal rises comes from CSS (--reveal-y: 40px desktop, 24px
     mobile) so the amplitude can be tuned per breakpoint without a second
     source of truth or a viewport branch in here. ANIM.Y_OFFSET is the
     fallback if the token is missing. Every reveal fires once, so reading the
     computed value at init time is enough.                                   */
  function revealY() {
    var y = parseFloat(
      window.getComputedStyle(document.documentElement)
        .getPropertyValue(ANIM.REVEAL_Y_VAR)
    );
    return isFinite(y) ? y : ANIM.Y_OFFSET;
  }

  /* How far below the viewport top the Cases filter row parks when a category
     regroup pulls the reader back up to it. Same CSS-token pattern as revealY:
     the value lives in variables.css, ANIM holds only the fallback. */
  function casesPinOffset() {
    var v = parseFloat(
      window.getComputedStyle(document.documentElement)
        .getPropertyValue(ANIM.FILTER_PIN_VAR)
    );
    return isFinite(v) ? v : ANIM.FILTER_PIN_OFFSET;
  }

  /* Scroll without the smooth animation :root asks for. Every scroll this file
     performs is a correction or a tween of its own, so it has to land on the
     frame it is issued — scroll-behavior:smooth (styles.css) would turn each
     one into a competing animation. */
  function setScroll(y) {
    window.scrollTo({ top: y, left: 0, behavior: "auto" });
  }

  /* True when the element sits entirely above the viewport. A reveal firing in
     that state is playing to an empty room: the page shifted under the reader
     (a Cases regroup shortening the document, say) rather than the reader
     scrolling down to it. Callers land such a reveal instantly instead of
     burning its fade where nobody can see it. */
  function isAboveViewport(el) {
    return el.getBoundingClientRect().bottom < 0;
  }

  /* ---- Hero reveal on load ----------------------------------------------
     Two parts. The wordmark is a masked line rise: each word's .hero__line
     slot is clipped at its BOTTOM edge only, and the word starts a full
     line-height below that edge, then slides up into place — BRANDCO first,
     STUDIO a beat behind. The clip bleeds generously on the other three sides
     so the rim stroke and the ® badge are never cut, and it is removed once
     the words have landed, so the resting wordmark is exactly as before.
     Everything else marked [data-animate] (the ticker) keeps the plain
     fade + rise.                                                            */
  function initHeroReveal() {
    var masks = heroWords.map(function (w) { return w.parentNode; });

    if (heroWords.length) {
      window.gsap.set(masks, { clipPath: "inset(-100% -100% 0 -100%)" });
      // opacity:1 overrides the CSS pre-hide; the word is still invisible at this
      // instant because it sits below the slot's clipped edge.
      window.gsap.set(heroWords, { opacity: 1, yPercent: ANIM.HERO_START_OFFSET });
      window.gsap.to(heroWords, {
        yPercent: 0,
        duration: ANIM.HERO_DURATION,
        ease: ANIM.EASE,
        stagger: ANIM.HERO_STAGGER,
        clearProps: "transform,will-change",
        onComplete: function () {
          window.gsap.set(masks, { clearProps: "clipPath" });
        }
      });
    }

    if (animated.length) {
      window.gsap.set(animated, { opacity: 0, y: revealY() });
      window.gsap.to(animated, {
        opacity: 1,
        y: 0,
        duration: ANIM.HERO_DURATION,
        ease: ANIM.EASE,
        stagger: ANIM.STAGGER,
        clearProps: "transform,will-change"
      });
    }

    // Failsafe: if the tab loaded in the background and the tweens were
    // throttled, force anything still hidden into place — words, their slot
    // clips, and the plain fades alike. No-op once the tweens have run.
    var grace = (ANIM.HERO_DURATION
      + ANIM.HERO_STAGGER * heroWords.length
      + ANIM.STAGGER * animated.length
      + 0.5) * 1000;
    window.setTimeout(function () {
      heroWords.concat(animated).forEach(function (el) {
        var cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity) < 1 || cs.transform !== "none") {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
      masks.forEach(function (m) { m.style.clipPath = ""; });
    }, grace);
  }

  /* ---- Scroll-in reveals (fade + translateY, once per element) ---------- */
  function initScrollReveals() {
    if (!revealTargets.length) return;

    var y = revealY();

    revealTargets.forEach(function (el) {
      window.gsap.set(el, { opacity: 0, y: y });
      window.gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: ANIM.DURATION,
        ease: ANIM.EASE,
        clearProps: "transform,will-change",
        scrollTrigger: {
          trigger: el,
          start: ANIM.REVEAL_START,
          once: true,
          onEnter: function (self) {
            if (self.animation && isAboveViewport(el)) self.animation.progress(1);
          }
        }
      });
    });
  }

  /* ---- Stats: staggered block reveal + rolling-odometer digits -----------
     One ScrollTrigger'd timeline. Per block, offset by STAT_STAGGER:
       • the block fades/rises in;
       • its rolling counter starts (springs from 0 to the target).
     Runs once when the stats grid reaches the viewport.                       */
  function initStats() {
    if (!statCounters.length) return;

    var statsBlock = document.querySelector("[data-stats]");
    var statBlocks = Array.prototype.slice.call(
      (statsBlock || document).querySelectorAll(".stat")
    );

    // Pre-hide the blocks; counters sit at 0 until their turn. Half the travel
    // of a full-width reveal, as on desktop — 20px there, 12px on mobile.
    var y = revealY() * 0.5;
    statBlocks.forEach(function (block) {
      window.gsap.set(block, { opacity: 0, y: y });
    });
    statCounters.forEach(function (c) { c.reset(); });

    var tl = window.gsap.timeline({
      scrollTrigger: {
        trigger: statsBlock || statValues[0],
        start: ANIM.STAT_START,
        once: true
      }
    });

    statBlocks.forEach(function (block, i) {
      var at = i * ANIM.STAT_STAGGER;
      tl.to(block, {
        opacity: 1,
        y: 0,
        duration: ANIM.DURATION,
        ease: ANIM.EASE,
        clearProps: "willChange"
      }, at);
      if (statCounters[i]) tl.call(statCounters[i].start, null, at);
    });
  }

  /* ---- Services accordion -----------------------------------------------
     Single-open: expanding an item collapses the previous one, so the section
     keeps roughly its designed height (every section is absolutely positioned
     at a fixed y, so a growing one would run into the next).

     `useMotion` off (reduced motion / no GSAP) keeps the accordion fully
     working — it just snaps instead of tweening.                             */
  function initServices(useMotion) {
    var list = document.querySelector("[data-accordion]");
    if (!list) return;

    var items = Array.prototype.slice.call(
      list.querySelectorAll("[data-accordion-item]")
    );
    if (!items.length) return;

    var current = null;

    function parts(item) {
      return {
        row: item.querySelector(".services__row"),
        panel: item.querySelector("[data-accordion-panel]"),
        content: Array.prototype.slice.call(
          item.querySelectorAll("[data-accordion-content]")
        )
      };
    }

    function expand(item, animate) {
      var p = parts(item);
      item.classList.add("is-open");
      p.row.setAttribute("aria-expanded", "true");
      current = item;

      if (!animate) {
        p.panel.style.height = "auto";
        p.panel.style.overflow = "visible";
        p.content.forEach(function (el) {
          el.style.opacity = "";
          el.style.transform = "";
        });
        return;
      }

      window.gsap.killTweensOf(p.panel);
      window.gsap.killTweensOf(p.content);
      // Clip while the height is moving, then release it: the copy fades in
      // from 10px down, which would otherwise be cut off by the panel's edge.
      p.panel.style.overflow = "hidden";
      window.gsap.to(p.panel, {
        height: "auto",
        duration: ANIM.PANEL_DURATION,
        ease: ANIM.EASE,
        onComplete: function () {
          p.panel.style.overflow = "visible";
        }
      });
      window.gsap.fromTo(
        p.content,
        { opacity: 0, y: ANIM.PANEL_FADE_Y },
        {
          opacity: 1,
          y: 0,
          duration: ANIM.PANEL_FADE,
          ease: ANIM.EASE,
          delay: ANIM.PANEL_FADE_DELAY,
          stagger: ANIM.STAGGER * 0.5,
          clearProps: "transform"
        }
      );
    }

    function collapse(item, animate) {
      var p = parts(item);
      item.classList.remove("is-open");
      p.row.setAttribute("aria-expanded", "false");
      p.panel.style.overflow = "hidden";
      if (current === item) current = null;

      if (!animate) {
        p.panel.style.height = "0px";
        return;
      }

      window.gsap.killTweensOf(p.panel);
      window.gsap.killTweensOf(p.content);
      window.gsap.to(p.content, {
        opacity: 0,
        duration: ANIM.PANEL_FADE * 0.6,
        ease: ANIM.EASE
      });
      window.gsap.to(p.panel, {
        height: 0,
        duration: ANIM.PANEL_DURATION,
        ease: ANIM.EASE
      });
    }

    items.forEach(function (item) {
      var row = item.querySelector(".services__row");
      if (!row) return;

      // The markup ships item 01 open — adopt that state without animating.
      if (item.classList.contains("is-open")) {
        expand(item, false);
      }

      row.addEventListener("click", function () {
        if (item === current) {
          collapse(item, useMotion);
          return;
        }
        if (current) collapse(current, useMotion);
        expand(item, useMotion);
      });
    });

    // Rows reveal as they arrive, batched like the Cases and Team grids rather
    // than fired together off one trigger on the list. The list is 786px of
    // rows spread over 672px: on one trigger, rows 02-06 were all still below
    // the fold when it fired, so five sixths of the animation played where
    // nobody could see it. ScrollTrigger.batch reveals whatever crosses the
    // line together, so a slow scroll brings them in one at a time and a fast
    // one groups them and staggers the group.
    if (useMotion) {
      // Three quarters of --reveal-y (30px desktop / 18px mobile): between the
      // half-travel the grids use and the full travel of the big headings.
      // Full was a heavy, out-of-place slide over a 113px row; half finished so
      // quickly on something this short that the reveal barely registered.
      window.gsap.set(items, { opacity: 0, y: revealY() * 0.75 });
      window.ScrollTrigger.batch(items, {
        // Not REVEAL_START: see ROW_REVEAL_START — the list's closing border
        // turns an unrevealed row into an empty slot.
        start: ANIM.ROW_REVEAL_START,
        once: true,
        // Group only rows that cross the line in the SAME instant. A Cases or
        // Team batch is a horizontal row that crosses together, so the default
        // 0.1s window never queues anything. These rows are stacked ~113px
        // apart, so that window swept 3-4 of them into one batch and the
        // stagger then held the last one back ~0.4s after it was already on
        // screen — the lag that made this section feel out of step.
        interval: ANIM.BATCH_INTERVAL,
        onEnter: function (batch) {
          // A row the page shifted past — rather than one the reader scrolled
          // to — lands instantly instead of playing out of sight.
          var unseen = isAboveViewport(batch[0]);
          window.gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: unseen ? 0 : ANIM.ROW_DURATION,
            ease: ANIM.EASE,
            stagger: unseen ? 0 : ANIM.STAGGER,
            clearProps: "transform,willChange"
          });
        }
      });
    }
  }

  /* ---- Cases: category filter + card reveals -----------------------------
     The grid is one flex-wrap row of all 7 cards (no per-row wrappers), so
     hiding a card lets the rest reflow on their own. GSAP's Flip plugin turns
     that reflow into a tween: snapshot the layout, flip the display, let Flip
     animate every card from where it was to where it landed.

     Two things set this section apart from every other one, and both are
     handled here rather than left to ScrollTrigger:

       • the cards carry a scroll reveal AND a filter animation, both driving
         opacity (see retireReveals);
       • Cases is the only section in normal document flow, so its height is
         the offset of everything after it (see the scroll pin in applyFilter).

     Every branch degrades cleanly — no Flip, no GSAP, or reduced motion all
     still filter, they just switch instantly.                                */
  function initCases(useMotion) {
    var filterRow = document.querySelector("[data-cases-filters]");
    var grid = document.querySelector("[data-cases-grid]");
    if (!filterRow || !grid) return;

    var buttons = Array.prototype.slice.call(
      filterRow.querySelectorAll("[data-filter]")
    );
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".cases__card"));
    if (!buttons.length || !cards.length) return;

    var canFlip = useMotion && gsapReady && typeof window.Flip !== "undefined";
    var currentFilter = "all";
    var revealTriggers = null;  // the ScrollTrigger.batch instances (see below)
    var regroup = null;         // timeline of the regroup currently in flight
    var releasePin = null;      // detaches the scroll-pin listeners
    var releaseWatch = null;    // detaches the mid-regroup scroll watcher

    // A card matches when it carries the category — "all" matches everything.
    function matches(card, filter) {
      if (filter === "all") return true;
      var cats = (card.getAttribute("data-categories") || "").split(/\s+/);
      return cats.indexOf(filter) !== -1;
    }

    function setFilterClasses(filter) {
      cards.forEach(function (card) {
        card.classList.toggle("is-filtered-out", !matches(card, filter));
      });
    }

    /* The scroll reveal and the filter both own card opacity, and Flip
       snapshots whatever inline opacity it finds and restores it when the
       regroup lands — so a card caught mid-reveal would be frozen at that value
       for good, and one whose turn had not come yet would stay invisible even
       when it matches the chosen category. The two must never overlap: the
       FIRST filter click ends the reveal phase. By then the visitor is plainly
       looking at the grid, so nothing is lost, and Flip's onEnter/onLeave
       become the sole owner of card opacity — which also means there is no
       `once` trigger left in here for the refresh below to burn. */
    function retireReveals() {
      if (!revealTriggers) return;
      revealTriggers.forEach(function (st) { st.kill(); });
      revealTriggers = null;
      window.gsap.killTweensOf(cards);
      window.gsap.set(cards, { opacity: 1, y: 0, clearProps: "willChange" });
    }

    function applyFilter(filter) {
      if (filter === currentFilter) return;
      currentFilter = filter;

      buttons.forEach(function (btn) {
        var isActive = btn.getAttribute("data-filter") === filter;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      if (useMotion && gsapReady) retireReveals();

      if (!canFlip) {
        setFilterClasses(filter);
        return;
      }

      // Finish any regroup still in flight first: Flip lifts the movers to
      // position:absolute while it runs, and snapshotting mid-tween would record
      // that as the "before" layout — so a fast second click would strand the
      // cards out of flow. Complete the flip BEFORE killing the timeline that
      // carries it, or the kill is what strands them.
      window.Flip.killFlipsOf(cards, true);
      if (regroup) regroup.kill();
      regroup = null;
      if (releasePin) releasePin();
      if (releaseWatch) releaseWatch();
      window.gsap.killTweensOf(grid);
      window.gsap.set(grid, { clearProps: "height" });

      var scrollFrom = window.scrollY || window.pageYOffset || 0;
      var rowTop = filterRow.getBoundingClientRect().top;

      // Snapshot the layout, flip the classes, then pin the OLD height so the
      // reflow does not land instantly — the grid tweens to its new height on
      // the same clock as the cards, so the whole section closes up (or opens
      // out) as one continuous movement instead of snapping.
      var heightFrom = grid.offsetHeight;
      var state = window.Flip.getState(cards);
      setFilterClasses(filter);
      var heightTo = grid.offsetHeight;
      window.gsap.set(grid, { height: heightFrom });

      // Nothing ABOVE the grid moved, so putting the scroll position back puts
      // the filter row back exactly. This only undoes the browser's own scroll
      // anchoring, which tries to re-aim at the reflow.
      if ((window.scrollY || window.pageYOffset || 0) !== scrollFrom) {
        setScroll(scrollFrom);
      }

      // Hand the grid back to auto height once the tween has landed on the new
      // one, so a later viewport or content change is not fought by a stale
      // inline height. Flip puts its movers back into flow as part of its own
      // cleanup, so wait until no card is still position:absolute — clearing a
      // frame early collapses the grid to nothing, and ScrollTrigger would then
      // record every trigger below against that phantom layout and fire them
      // all at once.
      function stillFlying() {
        for (var i = 0; i < cards.length; i++) {
          if (window.getComputedStyle(cards[i]).position === "absolute") return true;
        }
        return false;
      }
      function release() {
        if (stillFlying()) {
          window.gsap.delayedCall(0, release);
          return;
        }
        window.gsap.set(grid, { clearProps: "height" });
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }

      // ONE timeline for the regroup: the grid's height, the cards and (when it
      // is needed) the reader's scroll all run off the same clock, at the same
      // duration and the same ease, so there is a single continuous movement
      // rather than several that start and stop at different moments.
      var tl = window.gsap.timeline({
        onComplete: function () {
          if (regroup !== tl) return;   // superseded by a newer click
          regroup = null;
          if (releasePin) releasePin();
          if (releaseWatch) releaseWatch();
          release();
        }
      });
      regroup = tl;

      // Cases is the only section in normal document flow, so this tween slides
      // Process, Team, Reviews and the Footer with it — up to 1800px of page.
      // ScrollTrigger's map has to keep up or their reveals fire at scroll
      // positions that no longer mean anything, so re-measure as the height
      // travels rather than only at the end. Reading the inline style instead
      // of offsetHeight keeps this off the layout path.
      // ...but only while the reader is actually scrolling. A stale map harms
      // nothing as long as nothing is evaluating it, and release() puts it
      // right at the end — so a click-and-watch regroup pays nothing at all.
      // That matters: ScrollTrigger.refresh() costs ~3ms here, and running it
      // every frame spent a fifth of the frame budget re-measuring a page
      // nobody was moving, which is its own source of stutter.
      var reMeasure = false;
      var noteScroll = function () { reMeasure = true; };
      window.addEventListener("scroll", noteScroll, { passive: true });
      releaseWatch = function () {
        window.removeEventListener("scroll", noteScroll);
        releaseWatch = null;
      };

      var measuredAt = heightFrom;
      tl.to(grid, {
        height: heightTo,
        duration: ANIM.FILTER_DURATION,
        ease: ANIM.EASE,
        onUpdate: function () {
          if (!reMeasure || !window.ScrollTrigger) return;
          var h = parseFloat(grid.style.height);
          if (Math.abs(h - measuredAt) >= ANIM.FILTER_REMEASURE) {
            measuredAt = h;
            window.ScrollTrigger.refresh();
          }
        }
      }, 0);

      // Reader deep inside the grid (filter row already scrolled off the top):
      // ride back up to it over the same beat, so they finish above the section
      // instead of stranded below a grid that is about to be far shorter. A
      // deliberate scroll wins — this is a correction, not a scroll lock.
      if (rowTop < 0) {
        var pin = { y: scrollFrom, active: true };
        var drop = function () { pin.active = false; };
        window.addEventListener("wheel", drop, { passive: true });
        window.addEventListener("touchmove", drop, { passive: true });
        window.addEventListener("keydown", drop);
        releasePin = function () {
          window.removeEventListener("wheel", drop);
          window.removeEventListener("touchmove", drop);
          window.removeEventListener("keydown", drop);
          releasePin = null;
        };
        tl.to(pin, {
          y: Math.max(0, scrollFrom + rowTop - casesPinOffset()),
          duration: ANIM.FILTER_DURATION,
          ease: ANIM.EASE,
          onUpdate: function () {
            // Instant per-frame writes — the tween supplies the easing, and
            // :root's scroll-behavior:smooth would otherwise animate every
            // single frame against itself.
            if (pin.active) setScroll(pin.y);
          }
        }, 0);
      }

      tl.add(
        window.Flip.from(state, {
          duration: ANIM.FILTER_DURATION,
          ease: ANIM.EASE,
          absolute: true,          // take the movers out of flow so they can cross
          onEnter: function (els) {
            return window.gsap.fromTo(
              els,
              { opacity: 0, scale: ANIM.FILTER_SCALE },
              {
                opacity: 1,
                scale: 1,
                duration: ANIM.FILTER_FADE,
                ease: ANIM.EASE
                // NO clearProps here. Flip positions these cards with a
                // transform while they are absolute, and clearing "scale" makes
                // GSAP rewrite that transform from its own cache — which drops
                // the translate too, so every entering card fell to the grid's
                // top-left corner the moment this fade ended and sat there
                // until Flip restored flow, then snapped into its slot. Flip
                // strips its own inline styles at the end anyway.
              }
            );
          },
          onLeave: function (els) {
            return window.gsap.to(els, {
              opacity: 0,
              scale: ANIM.FILTER_SCALE,
              duration: ANIM.FILTER_FADE,
              ease: ANIM.EASE
            });
          }
        }),
        0
      );
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyFilter(btn.getAttribute("data-filter") || "all");
      });
    });

    if (!useMotion) return;

    // Reveal: ScrollTrigger.batch groups whatever crosses the line together,
    // which over this wrapping grid means the cards arrive row by row (and, on
    // mobile's single column, one card at a time). Same fade + translateY, but
    // the travel comes from --reveal-y so mobile gets 12px where desktop gets
    // 20 — a 20px drop reads large against a 343px card.
    //
    // Keep the triggers batch() hands back: the first filter click retires them
    // (see retireReveals) so the reveal and the regroup never fight over a
    // card's opacity.
    window.gsap.set(cards, { opacity: 0, y: revealY() * 0.5 });
    revealTriggers = window.ScrollTrigger.batch(cards, {
      start: ANIM.REVEAL_START,
      once: true,
      onEnter: function (batch) {
        window.gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: ANIM.DURATION,
          ease: ANIM.EASE,
          stagger: ANIM.STAGGER,
          clearProps: "willChange"
        });
      }
    });
  }

  /* ---- Team: card reveals ------------------------------------------------
     Six static cards — 3 x 2 on desktop, 2 x 3 on mobile. Batched, not one
     trigger on the whole grid: the grid is taller than the gap between its
     rows, so a single trigger fired all six the moment row 1 crossed the line
     and row 2 played out ~450px before the reader could reach it. Same
     ScrollTrigger.batch as the Cases grid — whatever crosses the line together
     is revealed together, which over this grid means one row at a time, and the
     stagger runs across that row rather than across the whole section.

     The section title reveals separately via its own [data-reveal]
     (initScrollReveals).                                                      */
  function initTeam(useMotion) {
    if (!useMotion) return;

    var grid = document.querySelector("[data-team-grid]");
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".team__card"));
    if (!cards.length) return;

    window.gsap.set(cards, { opacity: 0, y: revealY() * 0.5 });
    window.ScrollTrigger.batch(cards, {
      start: ANIM.REVEAL_START,
      once: true,
      onEnter: function (batch) {
        // A row the page shifted past — rather than one the reader scrolled to
        // — lands instantly instead of playing where nobody can see it.
        var unseen = isAboveViewport(batch[0]);
        window.gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: unseen ? 0 : ANIM.DURATION,
          ease: ANIM.EASE,
          stagger: unseen ? 0 : ANIM.STAGGER,
          clearProps: "willChange"
        });
      }
    });
  }

  /* ---- Reviews: stacked-card carousel ------------------------------------
     N cards overlaid in one stage. `active` is the front card; every card's
     SLOT = (i - active + N) % N (0 = front, 1..N-1 = increasing depth) drives
     its transform, so next()/prev() just re-rank and re-render. The fan itself
     — every slot's offset, tilt and fill — lives in variables.css as the
     --review-slot-N-x / -y / -rot and --color-review-card* tokens, so desktop
     and mobile hand this the same code and a different stack shape.

     `useMotion` off (reduced motion / no GSAP) keeps arrows + swipe fully
     working — the stack just snaps to each new order instead of tweening.       */
  function initReviews(useMotion) {
    var carousel = document.querySelector("[data-reviews]");
    if (!carousel) return;

    var stack = carousel.querySelector("[data-reviews-stack]");
    var cards = stack
      ? Array.prototype.slice.call(stack.querySelectorAll("[data-review-card]"))
      : [];
    var segs = Array.prototype.slice.call(
      carousel.querySelectorAll("[data-reviews-progress] .reviews__seg")
    );
    var prevBtn = carousel.querySelector("[data-reviews-prev]");
    var nextBtn = carousel.querySelector("[data-reviews-next]");
    if (cards.length < 2) return;

    var N = cards.length;
    var active = 0;      // DOM index of the front card (drives the stack slots)
    var position = 0;    // progress step 0..N-1 (drives the progress indicator)

    // Hide any portrait that fails to load so the designed #2a2a2a media box
    // shows cleanly instead of a broken-image icon.
    Array.prototype.slice.call(stack.querySelectorAll(".reviews__photo"))
      .forEach(function (img) {
        function hide() { img.style.display = "none"; }
        if (img.complete && img.naturalWidth === 0) hide();
        img.addEventListener("error", hide);
      });

    // The fan, slot 0 = front … slot 4 = deepest. Each card is full-size (NO
    // scale) — only offset (px, from the front card's RESTING centre), rotated,
    // and given its own progressively darker SOLID fill. Every one of those
    // numbers is a token, so the desktop mockup (223:4114) and the mobile one
    // (434:1922) each supply their own set from their own breakpoint.
    // rootCss is live, so re-reading it after a breakpoint change is enough.
    var rootCss = window.getComputedStyle(document.documentElement);
    function cssColor(name) { return rootCss.getPropertyValue(name).trim(); }
    function cssNum(name) { return parseFloat(rootCss.getPropertyValue(name)) || 0; }

    var SLOTS = [];
    function readSlots() {
      SLOTS = [];
      for (var s = 0; s < N; s++) {
        SLOTS.push({
          x: cssNum("--review-slot-" + s + "-x"),
          y: cssNum("--review-slot-" + s + "-y"),
          rot: cssNum("--review-slot-" + s + "-rot"),
          bg: cssColor("--color-review-card" + (s ? "-" + s : ""))
        });
      }
    }
    readSlots();

    // Writing a card's slot = writing 3 custom properties + z-index + fill. The
    // MOVEMENT is entirely the CSS transition on .reviews__card — no JS tweening.
    function placeCard(card, slot) {
      var s = SLOTS[Math.min(slot, SLOTS.length - 1)];
      card.style.setProperty("--rx", s.x + "px");
      card.style.setProperty("--ry", s.y + "px");
      card.style.setProperty("--rot", s.rot + "deg");
      card.style.zIndex = N - slot;
      card.style.backgroundColor = s.bg;
      // Keep the buried cards out of the tab order (only the front is reachable).
      card.setAttribute("aria-hidden", slot === 0 ? "false" : "true");
    }

    function slotOf(i) { return (i - active + N) % N; }

    function paintProgress() {
      segs.forEach(function (seg, i) {
        seg.classList.toggle("is-active", i === position);
      });
    }

    function render() {
      cards.forEach(function (card, i) { placeCard(card, slotOf(i)); });
      paintProgress();
    }

    /* Deal-in reveal — the fan is "dealt" when the stack scrolls into view.
       Each card starts invisible, pushed DOWN from its slot, scaled down and with
       NO rotation (a flat pile), then flies up into its slot, taking on its final
       offset + tilt as it lands. Cards go deepest-FIRST and the front card LAST,
       so the fan builds underneath and the main card drops on top to finish.
       Runs once. z-index / background were already set by render(false), so this
       only animates transform + opacity. */
    var dealt = false;
    function dealIn() {
      if (dealt) return;
      dealt = true;

      // Order by depth: deepest slot first, front card (slot 0) last.
      var order = cards
        .map(function (card, i) { return { card: card, slot: slotOf(i) }; })
        .sort(function (a, b) { return b.slot - a.slot; });

      order.forEach(function (entry, step) {
        entry.card.style.transitionDelay =
          (step * ANIM.REVIEW_DEAL_STAGGER) + "s";
      });

      stack.classList.add("is-dealing");
      carousel.classList.add("is-revealed");
      // Flush the start pose so dropping .is-pre-deal reads as a change to
      // transition FROM, rather than being collapsed into one style recalc.
      void stack.offsetHeight;
      cards.forEach(function (card) { card.classList.remove("is-pre-deal"); });

      window.setTimeout(function () {
        stack.classList.remove("is-dealing");
        cards.forEach(function (card) { card.style.transitionDelay = ""; });
      }, (ANIM.REVIEW_DEAL_DURATION + ANIM.REVIEW_DEAL_STAGGER * N) * 1000);
    }

    /* ---- Shuffle ---------------------------------------------------------
       busy is the click blocker: the whole sequence is one atomic move, so
       every entry point (arrows, swipe) bails while a shuffle is in flight.
       Without it a fast double-click would re-enter mid-flight, reassign slots
       under the flying card and strand it out of the deck.                   */
    var busy = false;

    // Forward — the REARMOST card is pulled out from behind the deck and drops
    // into the front slot:
    //   1. it takes the top z-index and rises straight UP above the stack,
    //   2. the rest of the deck shifts back one slot to make room,
    //   3. it comes straight DOWN onto the now-empty front slot.
    function shuffleNext() {
      var mover = null;
      cards.forEach(function (card, i) {
        if (slotOf(i) === N - 1) mover = card;
      });
      if (!mover) return;

      busy = true;

      // Advance the deck first, so the mover's slot vars are already the FRONT
      // slot — that is what makes both the rise and the fall purely vertical,
      // ending exactly over the front position.
      active = (active - 1 + N) % N;
      position = (position + 1) % N;

      // 1 — take the front slot's POSITION instantly (no transition), but keep
      //     the card's rear-of-deck GREY: it is still the back card being pulled
      //     out, and it only warms to cream on the way down (phase 3).
      //     z-index stays LOW here on purpose: the card must rise from BEHIND
      //     the deck. Raising it now would pop a card over the front card.
      var deepBg = SLOTS[Math.min(N - 1, SLOTS.length - 1)].bg;
      mover.style.transition = "none";
      placeCard(mover, 0);            // slotOf(mover) is now 0
      mover.style.zIndex = 0;         // keep it behind the whole deck while it rises
      mover.style.backgroundColor = deepBg;   // …still the grey back card
      void mover.offsetHeight;        // commit that state before transitioning
      mover.style.transition = "";    // hand control back to the CSS transitions

      // 2 — pull it straight up, out from behind the deck.
      mover.classList.add("is-lifting");

      //     …and the rest of the deck slides back a slot at the same time.
      cards.forEach(function (card, i) {
        if (card !== mover) placeCard(card, slotOf(i));
      });
      paintProgress();

      // 3 — now that it is clear of the deck, put it on top and let it come
      //     back down, overlapping the card that used to be first.
      window.setTimeout(function () {
        mover.style.zIndex = N + 1;
        mover.classList.remove("is-lifting");
        mover.classList.add("is-settling");
        // …and only NOW does it warm from the deck grey to the front card's
        // cream — a smooth fade across the whole descent, not a hard swap.
        mover.style.backgroundColor = SLOTS[0].bg;

        window.setTimeout(function () {
          mover.classList.remove("is-settling");
          mover.style.zIndex = N;     // back into the normal z range
          busy = false;
        }, ANIM.REVIEW_SETTLE_DURATION * 1000);
      }, ANIM.REVIEW_LIFT_DURATION * 1000);
    }

    // Backward — the exact mirror: the FRONT card is lifted straight up off the
    // deck (staying cream, it is still the front card being taken off the top),
    // then slides back down BEHIND the deck into the rearmost slot, fading from
    // cream to the deck grey on the way down.
    function shufflePrev() {
      var mover = null;
      cards.forEach(function (card, i) {
        if (slotOf(i) === 0) mover = card;
      });
      if (!mover) return;

      busy = true;

      // Step the deck back. The mover keeps its FRONT slot vars for now, so the
      // lift starts from exactly where it already sits — no jump. (Forward has
      // to snap its vars first because it starts hidden behind the deck; here
      // the card is the visible one on top, so any snap would show.)
      active = (active + 1) % N;
      position = (position - 1 + N) % N;

      // 1 — above the whole deck, then pulled straight up off it.
      mover.style.zIndex = N + 1;
      mover.classList.add("is-lifting");

      // 2 — the rest of the deck slides one slot forward to close the gap.
      cards.forEach(function (card, i) {
        if (card !== mover) placeCard(card, slotOf(i));
      });
      paintProgress();

      // 3 — it descends into the rearmost slot. placeCard hands it the deck grey
      //     and the rear z-index, so it fades out and drops behind the stack.
      window.setTimeout(function () {
        mover.classList.remove("is-lifting");
        mover.classList.add("is-settling");
        placeCard(mover, N - 1);   // slotOf(mover) is now N-1

        window.setTimeout(function () {
          mover.classList.remove("is-settling");
          busy = false;
        }, ANIM.REVIEW_SETTLE_DURATION * 1000);
      }, ANIM.REVIEW_LIFT_DURATION * 1000);
    }

    function go(dir) {
      if (busy) return;                      // blocker: ignore clicks mid-shuffle
      if (!useMotion) {                      // reduced motion: snap, no sequence
        active = (active - dir + N) % N;
        position = (position + dir + N) % N;
        render();
        return;
      }
      if (dir > 0) shuffleNext();
      else shufflePrev();
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

    // Swipe (pointer events cover touch + mouse). A drag past the threshold
    // navigates; a small movement falls through so the "View the case" link
    // still registers as a normal click/tap.
    var startX = null;
    stack.addEventListener("pointerdown", function (e) { startX = e.clientX; });
    stack.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < ANIM.REVIEW_SWIPE) return;
      go(dx < 0 ? 1 : -1);   // drag left → next, drag right → prev
    });
    stack.addEventListener("pointercancel", function () { startX = null; });

    render();   // place the initial stack (James front)

    // Crossing the mobile breakpoint (rotate, resize) swaps the whole token set
    // under us, so re-read the fan and re-place the deck. Driven off resize with
    // a state check rather than a MediaQueryList "change" listener: same result,
    // and it also survives viewport overrides (devtools / device emulation),
    // which re-evaluate media queries without dispatching that event.
    var slotMq = window.matchMedia("(max-width: 767px)");
    var wasNarrow = slotMq.matches;
    window.addEventListener("resize", function () {
      if (slotMq.matches === wasNarrow) return;
      // Mid-shuffle, re-placing would fight the transition the sequencer is in
      // the middle of and strand `busy`. Leave wasNarrow alone so the next
      // resize event retries; a drag emits plenty.
      if (busy) return;
      wasNarrow = slotMq.matches;
      readSlots();
      render();
    });

    if (!useMotion) {
      // Reduced motion / no GSAP: show the finished fan at once, nothing is dealt.
      carousel.classList.add("is-revealed");
      cards.forEach(function (card) {
        card.classList.remove("is-pre-deal");
        card.style.opacity = "1";
        card.style.willChange = "auto";
      });
      return;
    }

    // Hold the cards in their flat start pose until the stack scrolls into view.
    cards.forEach(function (card) { card.classList.add("is-pre-deal"); });
    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: stack,
        start: ANIM.REVEAL_START,
        once: true,
        onEnter: dealIn
      });
    } else {
      dealIn();   // no ScrollTrigger — just deal them on load
    }
  }

  /* ---- Boot ------------------------------------------------------------- */
  /* ---- Footer subscribe form (front-end mockup) ------------------------- */
  /* Motion-independent: wire it up in every boot path (below), so it works even
     under reduced motion or a failed GSAP load. Validation is the browser's own:
     the form is NOT novalidate and every field is required, so an invalid submit
     never reaches this handler — the browser blocks it, focuses the first bad
     field and shows its bubble there. Nothing in the form is marked up in red.
     No real submission: a valid send just clears the form and leaves a success
     line that removes itself.                                                   */
  function initFooterForm() {
    var form = document.querySelector("[data-footer-form]");
    if (!form) return;

    var msg = form.querySelector(".footer__form-msg");
    var successTimer = null;

    function clearSuccess() {
      if (successTimer) {
        clearTimeout(successTimer);
        successTimer = null;
      }
      if (msg) msg.textContent = "";
    }

    // Typing again drops the previous confirmation.
    form.addEventListener("input", clearSuccess);

    form.addEventListener("submit", function (e) {
      e.preventDefault();   // mockup — never actually send
      clearSuccess();

      form.reset();   // empties the fields; the labels drop back to placeholder position
      if (msg) msg.textContent = "Thanks — you’re on the list.";
      successTimer = setTimeout(function () {
        if (msg) msg.textContent = "";
        successTimer = null;
      }, ANIM.FORM_SUCCESS_HOLD * 1000);
    });
  }

  /* ==========================================================================
     Footer starfield

     The stars in "Bg-all 4-4.png" are baked pixels — they can never move. So
     this draws a SECOND, live population over the dark half of that slice: a
     slow one-way drift plus a cursor parallax split across three depth layers.
     The baked stars stay put underneath and read as static dust behind it.
     ========================================================================== */

  var TWO_PI = Math.PI * 2;

  /* mulberry32 — tiny seeded PRNG. Seeded on purpose: the field must come out
     identical on every load and survive a resize, or the sky visibly reshuffles. */
  function makeRandom(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      var x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* "#f5f5f0" (or "#fff") -> "245,245,240", ready to drop into an rgba(). */
  function hexToRgbParts(value) {
    var hex = String(value).trim().replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var n = parseInt(hex, 16);
    if (hex.length !== 6 || isNaN(n)) return "245,245,240"; // --color-text-primary
    return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
  }

  function initFooterStars(useMotion) {
    var canvas = document.querySelector("[data-footer-stars]");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Colour comes from --color-star. variables.css stays the single source of
    // truth for colour — never hard-code the value here.
    var rgb = hexToRgbParts(
      window.getComputedStyle(canvas).getPropertyValue("--color-star")
    );

    var width = 0;
    var height = 0;
    var stars = [];
    var rand = makeRandom(0x5ee0);

    for (var i = 0; i < ANIM.STAR_COUNT; i++) {
      var depth = ANIM.STAR_DEPTHS[i % ANIM.STAR_DEPTHS.length];
      stars.push({
        nx: rand(),          // normalised seed position, used on the first layout
        ny: rand(),
        x: 0,
        y: 0,
        depth: depth,
        // Nearer stars are bigger and brighter — that IS the depth cue.
        r: 0.35 + rand() * 0.5 + depth * 0.45,
        a: 0.14 + (0.2 + rand() * 0.45) * depth,
        // All drift the same way, with per-star jitter: a coherent field reads
        // as the sky turning, whereas mixed directions just look like noise.
        vx: 0.75 + rand() * 0.5,
        vy: -0.1 + (rand() - 0.5) * 0.16
      });
    }

    /* ---- Sizing: CSS pixels for drawing, device pixels for the buffer ----- */
    function layout() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      if (!w || !h || (w === width && h === height)) return;

      // First pass places from the seeds; later ones rescale what is already
      // there, so a resize never restarts the field.
      var sx = width ? w / width : 0;
      var sy = height ? h / height : 0;
      for (var j = 0; j < stars.length; j++) {
        var st = stars[j];
        st.x = sx ? st.x * sx : st.nx * w;
        st.y = sy ? st.y * sy : st.ny * h;
      }

      width = w;
      height = h;
      var dpr = Math.min(window.devicePixelRatio || 1, ANIM.STAR_DPR_MAX);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px regardless of DPR
    }

    /* ---- Draw ------------------------------------------------------------ */
    var offX = 0;
    var offY = 0;

    function draw() {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      for (var k = 0; k < stars.length; k++) {
        var s = stars[k];
        ctx.beginPath();
        // The parallax offset is applied here and deliberately NOT wrapped: a
        // star nudged past an edge is simply clipped. Wrapping it would teleport
        // edge stars across the band every time the cursor moved.
        ctx.arc(s.x + offX * s.depth, s.y + offY * s.depth, s.r, 0, TWO_PI);
        ctx.fillStyle = "rgba(" + rgb + "," + s.a + ")";
        ctx.fill();
      }
    }

    layout();
    draw();

    // Reduced motion (or no GSAP): the stars exist, they just never move. One
    // frame is painted above; from here on, no listeners and no loop.
    if (!useMotion) return;

    /* ---- Pointer: store raw coords only, do the maths in the frame ------- */
    var pointerX = 0;
    var pointerY = 0;
    var hasPointer = false;
    var coarse = window.matchMedia("(pointer: coarse)").matches;

    if (!coarse) {
      window.addEventListener("pointermove", function (e) {
        pointerX = e.clientX;
        pointerY = e.clientY;
        hasPointer = true;
      }, { passive: true });
    }

    /* ---- rAF loop, gated so it never runs off-screen --------------------- */
    var rafId = null;
    var last = 0;
    var visible = false;

    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.032) : 0.016;
      last = now;

      for (var m = 0; m < stars.length; m++) {
        var s = stars[m];
        s.x += s.vx * s.depth * ANIM.STAR_DRIFT * dt;
        s.y += s.vy * s.depth * ANIM.STAR_DRIFT * dt;
        // Wrap so the drift loops seamlessly and forever.
        if (s.x > width) s.x -= width; else if (s.x < 0) s.x += width;
        if (s.y > height) s.y -= height; else if (s.y < 0) s.y += height;
      }

      var tgtX = 0;
      var tgtY = 0;
      if (hasPointer) {
        // Recomputed every frame (not in the listener) so scrolling past the
        // band re-aims the parallax even when the cursor is still.
        var rect = canvas.getBoundingClientRect();
        if (rect.width && rect.height) {
          var nx = ((pointerX - rect.left) / rect.width) * 2 - 1;
          var ny = ((pointerY - rect.top) / rect.height) * 2 - 1;
          nx = Math.max(-1, Math.min(1, nx));
          ny = Math.max(-1, Math.min(1, ny));
          // Negative: the field slides AGAINST the cursor, nearer layers
          // further — that opposition is what reads as depth.
          tgtX = -nx * ANIM.STAR_PARALLAX_X;
          tgtY = -ny * ANIM.STAR_PARALLAX_Y;
        }
      }
      // Frame-rate-independent exponential smoothing, so the field feels
      // weighted instead of snapping to the cursor.
      var kf = 1 - Math.exp(-ANIM.STAR_FOLLOW * dt);
      offX += (tgtX - offX) * kf;
      offY += (tgtY - offY) * kf;

      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (rafId || !visible || document.hidden) return;
      last = 0; // fresh dt, or the first frame jumps by the whole pause
      rafId = window.requestAnimationFrame(frame);
    }

    function stop() {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = null;
      last = 0;
    }

    window.addEventListener("resize", function () {
      layout();
      if (!rafId) draw(); // keep the frozen frame correct while paused
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    // This is the bottom of a very long page, so the loop is idle most of the
    // time — only run it while the band is actually on screen.
    if (window.IntersectionObserver) {
      new window.IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    } else {
      visible = true;
      start();
    }
  }

  /* ==========================================================================
     Mobile navigation — burger toggle (Figma 434:1753)

     CSS owns every transition; this only swaps classes and keeps the ARIA and
     the scroll lock honest, so it needs no reduced-motion branch of its own
     (the panel's transitions are already disabled under the media query).
     ========================================================================== */
  /* ---- Smooth in-page navigation -----------------------------------------
     This lived in CSS as `html { scroll-behavior: smooth }`, which quietly
     broke ScrollTrigger. Its refresh pass measures by scrolling to 0 and back;
     with the CSS property on, those writes animated instead of landing, so
     every trigger below the fold was computed as if the page were at the top —
     short by the current scrollY. Refresh at 4167px and the Reviews trigger
     came out at 3189 instead of 7356, so Process, Team, Reviews and the Footer
     all fired the moment the page moved a pixel, off-screen and unrecoverable
     (`once: true`). Any refresh set it off: a resize, a late image, and above
     all the Cases filter regroup — which is why filtering used to leave the
     rest of the page with no animations at all.

     Doing it per click keeps the glide exactly where it belongs and leaves
     every programmatic scroll — ScrollTrigger's and ours — instant.          */
  function initSmoothAnchors() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest('a[href^="#"]');
      if (!link) return;

      var hash = link.getAttribute("href");
      if (!hash || hash === "#") return;   // placeholder link: leave it alone

      var target = document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();
      // #top is the <body> itself — the logo's "back to the start" link.
      var top = target === document.body
        ? 0
        : target.getBoundingClientRect().top +
          (window.scrollY || window.pageYOffset || 0);

      window.scrollTo({
        top: top,
        left: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", hash);
      }
    });
  }

  function initMobileNav() {
    var burger = document.querySelector("[data-burger]");
    var panel = document.querySelector("[data-nav-panel]");
    if (!burger || !panel) {
      return;
    }

    function setOpen(open) {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.classList.toggle("is-open", open);
      document.body.classList.toggle("has-nav-open", open);
    }

    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });

    // Tapping a link navigates within the page, so close up behind it.
    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        burger.focus();
      }
    });

    // Leaving the mobile breakpoint with the panel up would strand the lock.
    window.matchMedia("(max-width: 767px)").addEventListener("change", function (event) {
      if (!event.matches) {
        setOpen(false);
      }
    });
  }

  function init() {
    // Build the rolling counters up front (needed by both paths below).
    statCounters = statValues.map(buildStatCounter);

    // Footer form and in-page nav are motion-independent — wire them in every
    // path (before the reduced-motion / no-GSAP early return below).
    initFooterForm();
    initSmoothAnchors();

    // Respect reduced motion, or a failed GSAP load: show content immediately.
    if (prefersReducedMotion || !gsapReady) {
      showEverythingStatic();
      initStickyHeader(); // class toggle only, no motion
      initMobileNav();     // no motion of its own — CSS handles it
      initServices(false); // still clickable, just no tweens
      initCases(false);    // filters still work, they just snap
      initReviews(false);  // arrows + swipe still cycle, they just snap
      initFooterStars(false); // stars are painted, they just never move
      return;
    }

    initStickyHeader();
    initMobileNav();
    initHeroReveal();
    initScrollReveals();
    initStats();
    initServices(true);
    initCases(true);
    initTeam(true);
    initReviews(true);
    initFooterStars(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
