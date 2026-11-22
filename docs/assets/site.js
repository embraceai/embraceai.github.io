/* markli.info runtime: theme + language switches, boot log, reading progress, topic filter.
   The theme and language are first applied by the inline script in <head> to avoid a flash. */
(function () {
  var root = document.documentElement;
  var LANGS = { en: "en", hans: "zh-Hans", hant: "zh-Hant" };
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var titles = {};
  try { titles = JSON.parse(document.getElementById("titles").textContent); } catch (e) {}

  function paint() {
    var t = root.dataset.theme, l = root.dataset.lang;
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      var on = b.dataset.themeSet === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      var on = b.dataset.lang === l; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
    root.lang = LANGS[l];
    if (titles[l]) document.title = titles[l];
    document.querySelectorAll("[data-tip-" + l + "]").forEach(function (el) {
      var s = el.getAttribute("data-tip-" + l); el.title = s; el.setAttribute("aria-label", s);
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-theme-set]");
    if (b) { root.dataset.theme = b.dataset.themeSet; store("ml-theme", b.dataset.themeSet); paint(); return; }
    b = e.target.closest("[data-lang]");
    if (b) { root.dataset.lang = b.dataset.lang; store("ml-lang", b.dataset.lang); paint(); boot(true); }
  });
  var mq = matchMedia("(prefers-color-scheme: light)");
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function (e) {
    if (!read("ml-theme")) { root.dataset.theme = e.matches ? "light" : "dark"; paint(); }
  });

  // Boot log on the home page: lines fade in one by one, once per visit.
  function boot(instant) {
    var lines = document.querySelectorAll(".boot span.l");
    var loc = document.querySelector(".boot .loc");
    if (loc) loc.textContent = LANGS[root.dataset.lang];
    if (!lines.length) return;
    if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lines.forEach(function (x) { x.classList.add("v"); }); return;
    }
    lines.forEach(function (x, i) { setTimeout(function () { x.classList.add("v"); }, 120 + i * 260); });
  }

  // Reading progress bar on article pages.
  var bar = document.querySelector(".progress");
  if (bar) {
    var tick = function () {
      var body = [].slice.call(document.querySelectorAll(".post-body")).filter(function (b) { return b.offsetParent; })[0];
      if (!body) return;
      var r = body.getBoundingClientRect(), h = r.height - innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, Math.max(0, -r.top / h * 100)) : 100) + "%";
    };
    addEventListener("scroll", tick, { passive: true }); addEventListener("resize", tick); document.addEventListener("click", function () { setTimeout(tick, 0); }); tick();
  }

  // Contents drawer on article pages: opens from the right, closes on Esc, outside click or link click.
  var drawer = document.getElementById("toc"), tbtn = document.querySelector(".toc-btn"), scrim = document.querySelector(".scrim");
  if (drawer && tbtn) {
    var setOpen = function (on) {
      drawer.classList.toggle("open", on);
      if (on) drawer.removeAttribute("inert"); else drawer.setAttribute("inert", "");
      tbtn.setAttribute("aria-expanded", on);
      if (on) { scrim.hidden = false; requestAnimationFrame(function () { scrim.classList.add("on"); }); var c = drawer.querySelector("ul:not([hidden]) a.cur") || drawer.querySelector(".x"); c.focus({ preventScroll: true }); }
      else { scrim.classList.remove("on"); setTimeout(function () { if (!drawer.classList.contains("open")) scrim.hidden = true; }, 280); }
    };
    tbtn.addEventListener("click", function () { setOpen(!drawer.classList.contains("open")); });
    scrim.addEventListener("click", function () { setOpen(false); });
    drawer.querySelector(".x").addEventListener("click", function () { setOpen(false); tbtn.focus(); });
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) { setOpen(false); tbtn.focus(); } });
    // Highlight the section being read.
    var spy = function () {
      var l = root.dataset.lang, cur = null;
      document.querySelectorAll(".prose h2[id^=\"" + l + "-\"]").forEach(function (h) { if (h.getBoundingClientRect().top < 140) cur = h.id; });
      drawer.querySelectorAll("a").forEach(function (x) { x.classList.toggle("cur", x.getAttribute("href") === "#" + cur); });
    };
    addEventListener("scroll", spy, { passive: true }); document.addEventListener("click", function () { setTimeout(spy, 0); }); spy();
  }

  // Topic filter on /articles/: ?topic=tech, kept in sync with the URL.
  var chips = document.querySelector(".chips");
  if (chips) {
    var apply = function (t) {
      chips.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", (b.dataset.topic || "") === t); });
      document.querySelectorAll("[data-topic-row]").forEach(function (r) {
        r.hidden = !!t && r.dataset.topicRow !== t;
      });
      document.querySelectorAll("h2.year").forEach(function (h) {
        var tb = h.nextElementSibling, any = tb && tb.querySelector("tr:not([hidden])");
        h.hidden = !any; if (tb) tb.hidden = !any;
      });
      var em = document.querySelector(".note.empty");
      if (em) em.hidden = !!document.querySelector("[data-topic-row]:not([hidden])");
    };
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var t = b.dataset.topic || "";
      history.replaceState(null, "", t ? "?topic=" + t : location.pathname);
      apply(t);
    });
    apply(new URLSearchParams(location.search).get("topic") || "");
  }

  paint(); boot(false);
})();
